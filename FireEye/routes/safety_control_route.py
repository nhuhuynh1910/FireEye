# -*- coding: utf-8 -*-
import asyncio
import json
import time
import uuid
from typing import Dict, List, Optional, Set
from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel

from services.auth_service import get_current_user
from services.db_service import (
    get_user_by_id,
    insert_audit_log,
    get_zone_authorizations,
    insert_zone_authorization,
    remove_zone_authorization,
    update_user_status_db,
    save_temporary_session,
    delete_temporary_session,
    get_all_temporary_sessions,
    get_audit_logs
)
from services.mqtt_service import mqtt_service
from services.camera_service import camera_service
from data.state import get_overall_status, zone_states, sensor_state, ai_state

router = APIRouter(
    prefix="/api/v1/safety",
    tags=["Safety Critical Control"]
)

# Cấu hình ngưỡng khẩn cấp (Emergency threshold)
GAS_CRITICAL_VALUE = 0  # Với MQ2 Active Low: 0 = Có khói/gas dày đặc (cảnh báo)
TEMP_CRITICAL_THRESHOLD = 50.0  # Độ C

# Thiết lập bộ nhớ đệm In-Memory lưu trữ các phiên biểu quyết
ACTIVE_VOTING_SESSIONS: Dict[str, dict] = {}

# Cấu hình luật đồng thuận mặc định (Ngưỡng đạt: 3/5 hoặc 2/5 tùy chủ sở hữu thiết lập)
# Mặc định là 3 phiếu đồng ý (từ 5 máy quản trị)
CONSENSUS_THRESHOLD = 3 

# Lớp quản lý WebSocket cho các Admin đang online
class SafetyConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}  # {user_id: websocket}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        # Phát trạng thái trực ca hiện tại cho client vừa kết nối
        await websocket.send_json({
            "type": "SYSTEM_STATUS",
            "active_sessions": list(ACTIVE_VOTING_SESSIONS.values()),
            "incident_state": ACTIVE_INCIDENT_RESPONSES
        })

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def broadcast_to_admins(self, message: dict, exclude_user_id: Optional[int] = None):
        for uid, ws in list(self.active_connections.items()):
            if exclude_user_id and uid == exclude_user_id:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                # Gỡ kết nối lỗi để tránh leak tài nguyên
                self.disconnect(uid)

manager = SafetyConnectionManager()

# --- MODEL DỮ LIỆU ---
class ControlRequest(BaseModel):
    zone_id: int
    action: str  # 'sprinkler_on' | 'sprinkler_off'

class IncidentRespondRequest(BaseModel):
    zone_id: int

class UserStatusUpdateRequest(BaseModel):
    is_active: int  # 0: Khoá, 1: Mở khoá


# --- ĐỀ XUẤT 1: ĐỒNG BỘ KHÓA TÀI KHOẢN (SOFT BLOCK) VỚI AI EDGE ---
@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int, 
    payload: UserStatusUpdateRequest, 
    current_user: dict = Depends(get_current_user)
):
    # Chỉ Owner hoặc Admin mới được thay đổi trạng thái hoạt động tài khoản
    if current_user["role"] not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Bạn không có quyền thực hiện thao tác này."
        )

    # Lấy thông tin user bị thay đổi trạng thái
    target_user = get_user_by_id(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    # Cập nhật trạng thái trong database
    update_user_status_db(user_id, payload.is_active)

    # Ghi Audit Log hành động thay đổi trạng thái
    action_text = "LOCK_USER" if payload.is_active == 0 else "UNLOCK_USER"
    insert_audit_log(
        user_id=current_user["id"],
        action=action_text,
        target_device=f"User_{user_id}",
        details=f"Admin {current_user['username']} đã thay đổi trạng thái user {target_user['username']} thành is_active={payload.is_active}."
    )

    # Đồng bộ hóa xuống Edge AI Box qua MQTT khi có hành động Khoá (Soft Block)
    if payload.is_active == 0:
        mqtt_payload = {
            "user_id": user_id,
            "username": target_user["username"],
            "action": "BLOCK_FACE",
            "timestamp": time.time()
        }
        # Gửi bản tin MQTT xuống Edge AI
        mqtt_service.publish("fireeye/edge/face-blacklist", mqtt_payload)
        print(f"[MQTT Blacklist] Đã đẩy yêu cầu chặn khuôn mặt của user '{target_user['username']}' xuống Edge AI.")

    return {
        "success": True,
        "message": f"Cập nhật trạng thái người dùng thành công. Trạng thái hoạt động: {payload.is_active}."
    }


# --- ĐIỀU PHỐI TRỰC CA (Incident Responsibility Logic) ---
# {zone_id: {"responder_id": int, "responder_name": str, "timestamp": float}}
ACTIVE_INCIDENT_RESPONSES: Dict[int, dict] = {}

@router.post("/incident/respond")
async def respond_to_incident(req: IncidentRespondRequest, current_user: dict = Depends(get_current_user)):
    zone_id = req.zone_id
    user_id = current_user["id"]
    full_name = current_user["full_name"] or current_user["username"]

    # Đăng ký nhận xử lý sự cố
    ACTIVE_INCIDENT_RESPONSES[zone_id] = {
        "responder_id": user_id,
        "responder_name": full_name,
        "timestamp": time.time()
    }

    # Báo cáo Audit Log hành động trực ca
    insert_audit_log(
        user_id=user_id,
        action="INCIDENT_RESPONDED",
        target_device=f"Zone_{zone_id}",
        details=f"Admin {full_name} xác nhận di chuyển đến hiện trường kiểm tra."
    )

    # Gửi Websocket đồng bộ tức thì đến 4 thiết bị còn lại
    await manager.broadcast_to_admins({
        "type": "INCIDENT_STATUS_UPDATE",
        "zone_id": zone_id,
        "responder_id": user_id,
        "responder_name": full_name,
        "message": f"Admin {full_name} đang đến hiện trường xác minh."
    })

    return {
        "success": True,
        "message": f"Bạn đã nhận xử lý sự cố tại Zone {zone_id}. Trạng thái đã được đồng bộ."
    }

@router.post("/incident/clear/{zone_id}")
async def clear_incident(zone_id: int, current_user: dict = Depends(get_current_user)):
    """Xóa trạng thái khẩn cấp sau khi đã xử lý xong tại hiện trường"""
    if zone_id in ACTIVE_INCIDENT_RESPONSES:
        responder_name = ACTIVE_INCIDENT_RESPONSES[zone_id]["responder_name"]
        del ACTIVE_INCIDENT_RESPONSES[zone_id]
        
        insert_audit_log(
            user_id=current_user["id"],
            action="INCIDENT_CLEARED",
            target_device=f"Zone_{zone_id}",
            details=f"Admin {current_user['full_name']} đã giải phóng trạng thái khẩn cấp (xử lý xong)."
        )
        
        await manager.broadcast_to_admins({
            "type": "INCIDENT_STATUS_CLEAR",
            "zone_id": zone_id,
            "message": f"Khu vực {zone_id} đã được giải phóng bởi {current_user['full_name']}."
        })
        
    return {"success": True, "message": "Giải phóng khu vực thành công"}


# --- API ĐIỀU KHIỂN & BỘ LỌC PHÂN TÁCH NGỮ CẢNH (Context Filtering) ---
@router.post("/control")
async def safety_control_api(req: ControlRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    role = current_user["role"]
    zone_id = req.zone_id
    action = req.action.upper()  # 'SPRINKLER_ON' | 'SPRINKLER_OFF'
    
    if action not in ["SPRINKLER_ON", "SPRINKLER_OFF"]:
        raise HTTPException(status_code=400, detail="Hành động không hợp lệ (Chỉ nhận 'sprinkler_on' hoặc 'sprinkler_off')")

    # 1. KIỂM TRA PHÂN QUYỀN TRÊN ZONE (Trừ OWNER luôn có quyền tối cao)
    if role != "OWNER":
        authorized_zones = get_zone_authorizations(user_id)
        if zone_id not in authorized_zones:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Tài khoản của bạn không được phân quyền quản trị khu vực (Zone) này."
            )

    # 2. XÁC ĐỊNH SỰ CỐ KHẨN CẤP ĐỂ TỰ ĐỘNG KHỞI CHẠY (Ngữ cảnh Tự động)
    is_emergency = False
    
    # Đọc chỉ số cảm biến từ In-Memory State
    is_sensor_danger = sensor_state.get("alertLevel") == "danger"
    is_ai_danger = ai_state.get("alertLevel") == "danger"
    
    # Kiểm tra chỉ số cụ thể của Zone
    zone_info = zone_states.get(zone_id, {})
    try:
        raw_temp = zone_info.get("temperature")
        temp = float(raw_temp) if raw_temp is not None else 0.0
    except (TypeError, ValueError):
        temp = 0.0

    try:
        raw_gas = zone_info.get("gas")
        gas = int(raw_gas) if raw_gas is not None else 1
    except (TypeError, ValueError):
        gas = 1
    
    if is_sensor_danger or is_ai_danger or temp >= TEMP_CRITICAL_THRESHOLD or gas == GAS_CRITICAL_VALUE:
        is_emergency = True
        
    if is_emergency:
        # Thực thi trực tiếp xuống thiết bị thông qua MQTT, bỏ qua biểu quyết
        value = 1 if action == "SPRINKLER_ON" else 0
        mqtt_result = mqtt_service.publish_motor_zone(zone_id, value)
        
        insert_audit_log(
            user_id=user_id,
            action=f"EMERGENCY_{action}",
            target_device=f"Zone_{zone_id}_Pump",
            details=f"Kích hoạt bơm tự động do hỏa hoạn khẩn cấp (Không biểu quyết). Chỉ số: Temp={temp}°C, Gas={gas}."
        )
        
        return {
            "status": "EMERGENCY_EXECUTED",
            "message": "Ngữ cảnh khẩn cấp: Bơm nước đã được kích hoạt trực tiếp.",
            "mqtt_result": mqtt_result
        }

    # 3. KIỂM TRA QUYỀN PHÁN QUYẾT TỐI CAO (Owner Override)
    if role == "OWNER":
        value = 1 if action == "SPRINKLER_ON" else 0
        mqtt_result = mqtt_service.publish_motor_zone(zone_id, value)
        
        insert_audit_log(
            user_id=user_id,
            action=f"OWNER_OVERRIDE_{action}",
            target_device=f"Zone_{zone_id}_Pump",
            details="Chủ sở hữu (Owner) sử dụng quyền Override điều khiển trực tiếp phần cứng."
        )
        
        return {
            "status": "OWNER_OVERRIDE_EXECUTED",
            "message": "Lệnh Owner Override đã được gửi trực tiếp xuống phần cứng.",
            "mqtt_result": mqtt_result
        }

    # 4. NGỮ CẢNH THỦ CÔNG: BẮT BUỘC KHỞI TẠO BIỂU QUYẾT ĐỒNG THUẬN (Multi-Sig)
    # Kiểm tra xem có phiên biểu quyết nào của zone này đang hoạt động không
    for sess in ACTIVE_VOTING_SESSIONS.values():
        if sess["zone_id"] == zone_id and sess["status"] == "PENDING":
            return {
                "status": "VOTE_ALREADY_EXISTS",
                "message": "Đang có một phiên biểu quyết đang diễn ra tại khu vực này.",
                "session_token": sess["session_token"]
            }

    # Tạo phiên biểu quyết mới
    session_token = str(uuid.uuid4())
    expires_in = 45
    expires_at = time.time() + expires_in
    
    session = {
        "session_token": session_token,
        "zone_id": zone_id,
        "initiator_id": user_id,
        "initiator_name": current_user["full_name"] or current_user["username"],
        "target_action": "ON" if action == "SPRINKLER_ON" else "OFF",
        "votes_approve": 1,  # Tự động tính phiếu của người đề xuất
        "votes_reject": 0,
        "voters_voted": [user_id],
        "threshold": CONSENSUS_THRESHOLD,
        "expires_at": expires_at,
        "status": "PENDING"
    }
    
    ACTIVE_VOTING_SESSIONS[session_token] = session
    
    # --- ĐỀ XUẤT 3: LƯU PHIÊN BỎ PHIẾU TẠM THỜI VÀO SQLITE ---
    save_temporary_session(session)

    # Ghi log phiên biểu quyết được tạo
    insert_audit_log(
        user_id=user_id,
        action="VOTING_SESSION_CREATED",
        target_device=f"Zone_{zone_id}_Pump",
        details=f"Yêu cầu điều khiển {action} được chuyển sang trạng thái biểu quyết."
    )

    # Tìm đường dẫn luồng RTSP camera của Zone để gửi kèm pop-up
    rtsp_url = f"rtsp://192.168.1.108:554/cam/realmonitor?channel={zone_id}&subtype=0"

    # Gửi Websocket yêu cầu hiển thị Pop-up tràn màn hình đếm ngược đến 4 Admin khác
    asyncio.create_task(manager.broadcast_to_admins({
        "type": "VOTE_REQUEST",
        "session_token": session_token,
        "zone_id": zone_id,
        "initiator_name": session["initiator_name"],
        "target_action": session["target_action"],
        "expires_in": expires_in,
        "live_stream_url": rtsp_url
    }, exclude_user_id=user_id))

    # Đăng ký Task đếm ngược 45 giây để tự động hủy phiên
    asyncio.create_task(handle_session_timeout(session_token, expires_in))

    return {
        "status": "VOTING_REQUIRED",
        "message": "Hệ thống an toàn: Đã khởi tạo phiên biểu quyết đa chữ ký 45 giây.",
        "session_token": session_token,
        "expires_in": expires_in
    }


async def handle_session_timeout(session_token: str, delay: int):
    """Đếm ngược và xử lý huỷ phiên biểu quyết nếu quá thời gian"""
    await asyncio.sleep(delay)
    if session_token in ACTIVE_VOTING_SESSIONS:
        session = ACTIVE_VOTING_SESSIONS[session_token]
        if session["status"] == "PENDING":
            session["status"] = "TIMEOUT"
            
            # Ghi log hệ thống
            insert_audit_log(
                user_id=None,
                action="VOTING_SESSION_TIMEOUT",
                target_device=f"Zone_{session['zone_id']}_Pump",
                details=f"Phiên biểu quyết bị huỷ bỏ do hết thời gian {delay} giây mà không đạt đồng thuận."
            )
            
            # Phát tín hiệu Websocket tắt Pop-up và báo lỗi
            await manager.broadcast_to_admins({
                "type": "VOTING_FINISHED",
                "session_token": session_token,
                "result": "TIMEOUT",
                "message": "Phiên biểu quyết đã kết thúc do hết thời gian bỏ phiếu."
            })
            
            # Xóa phiên khỏi SQLite & RAM cache
            delete_temporary_session(session_token)
            if session_token in ACTIVE_VOTING_SESSIONS:
                del ACTIVE_VOTING_SESSIONS[session_token]


# --- WEBSOCKET REAL-TIME VOTING PROTOCOL ---
@router.websocket("/ws")
async def safety_ws_endpoint(websocket: WebSocket):
    # Trích xuất access token từ cookie để xác thực kết nối WebSocket
    token = websocket.cookies.get("access_token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    from services.auth_service import decode_jwt
    try:
        payload = decode_jwt(token)
        sub_val = payload.get("sub")
        if sub_val is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        user_id = int(sub_val)
        user = get_user_by_id(user_id)
        if not user or user.get("is_active", 1) == 0:
            # Chặn kết nối nếu user bị khoá (Soft block)
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Chấp nhận kết nối và đăng ký vào Pool
    await manager.connect(user_id, websocket)
    
    try:
        while True:
            # Lắng nghe các sự kiện gửi lên từ Client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Định dạng nhận phiếu: {"type": "SUBMIT_VOTE", "session_token": "...", "choice": "APPROVE" | "REJECT"}
            if message.get("type") == "SUBMIT_VOTE":
                session_token = message.get("session_token")
                choice = message.get("choice")  # "APPROVE" hoặc "REJECT"
                
                if session_token in ACTIVE_VOTING_SESSIONS:
                    session = ACTIVE_VOTING_SESSIONS[session_token]
                    
                    if session["status"] != "PENDING":
                        continue
                        
                    # Chặn việc vote nhiều lần hoặc vote lại
                    if user_id in session["voters_voted"]:
                        await websocket.send_json({
                            "type": "ERROR",
                            "message": "Bạn đã bỏ phiếu cho phiên này rồi."
                        })
                        continue
                    
                    # --- ĐỀ XUẤT 2: XỬ LÝ LỆNH NGƯỢC CHIỀU (REJECT) & OWNER OVERRIDE ---
                    # Kịch bản A: Chủ sở hữu (OWNER) gửi phiếu REJECT -> Huỷ bỏ phiên lập tức
                    if choice == "REJECT" and user.get("role") == "OWNER":
                        session["status"] = "REJECTED"
                        
                        insert_audit_log(
                            user_id=user_id,
                            action="VOTING_SESSION_OWNER_REJECTED",
                            target_device=f"Zone_{session['zone_id']}_Pump",
                            details="Chủ sở hữu (Owner) sử dụng quyền Override để từ chối khẩn cấp yêu cầu điều khiển."
                        )
                        
                        await manager.broadcast_to_admins({
                            "type": "VOTING_FINISHED",
                            "session_token": session_token,
                            "result": "REJECTED",
                            "message": "Yêu cầu kích hoạt bị bác bỏ lập tức bởi Chủ sở hữu (Owner)."
                        })
                        
                        # Xóa khỏi database SQLite và bộ nhớ đệm RAM
                        delete_temporary_session(session_token)
                        del ACTIVE_VOTING_SESSIONS[session_token]
                        continue

                    # Lưu phiếu bầu thông thường
                    session["voters_voted"].append(user_id)
                    if choice == "APPROVE":
                        session["votes_approve"] += 1
                    else:
                        session["votes_reject"] += 1
                        
                    # Đồng bộ cập nhật trạng thái phiên bỏ phiếu tạm thời vào SQLite
                    save_temporary_session(session)

                    # Phát sóng số lượng phiếu bầu thay đổi real-time tới tất cả Admin
                    await manager.broadcast_to_admins({
                        "type": "VOTE_COUNT_UPDATE",
                        "session_token": session_token,
                        "votes_approve": session["votes_approve"],
                        "votes_reject": session["votes_reject"]
                    })
                    
                    # Kiểm tra ngưỡng đồng ý (Đạt đủ chữ ký số)
                    if session["votes_approve"] >= session["threshold"]:
                        session["status"] = "APPROVED"
                        
                        # Kích hoạt duy nhất 1 bản tin sạch xuống phần cứng qua MQTT
                        value = 1 if session["target_action"] == "ON" else 0
                        mqtt_result = mqtt_service.publish_motor_zone(session["zone_id"], value)
                        
                        insert_audit_log(
                            user_id=None,
                            action="VOTING_SESSION_APPROVED",
                            target_device=f"Zone_{session['zone_id']}_Pump",
                            details=f"Yêu cầu {session['target_action']} được phê duyệt thông qua biểu quyết đồng thuận ({session['votes_approve']} phiếu)."
                        )
                        
                        await manager.broadcast_to_admins({
                            "type": "VOTING_FINISHED",
                            "session_token": session_token,
                            "result": "APPROVED",
                            "message": f"Yêu cầu bật bơm đã được đồng thuận duyệt thành công!",
                            "mqtt_result": mqtt_result
                        })
                        
                        delete_temporary_session(session_token)
                        del ACTIVE_VOTING_SESSIONS[session_token]
                        
                    # Kịch bản B: Số phiếu phản đối (REJECT) đạt quá bán (>= threshold)
                    elif session["votes_reject"] >= session["threshold"]:
                        session["status"] = "REJECTED"
                        
                        insert_audit_log(
                            user_id=None,
                            action="VOTING_SESSION_REJECTED",
                            target_device=f"Zone_{session['zone_id']}_Pump",
                            details=f"Yêu cầu điều khiển bị bác bỏ bởi biểu quyết ({session['votes_reject']} phiếu chống)."
                        )
                        
                        await manager.broadcast_to_admins({
                            "type": "VOTING_FINISHED",
                            "session_token": session_token,
                            "result": "REJECTED",
                            "message": "Yêu cầu điều khiển bị từ chối bỏ phiếu bởi ban quản trị."
                        })
                        
                        delete_temporary_session(session_token)
                        del ACTIVE_VOTING_SESSIONS[session_token]
                        
    except WebSocketDisconnect:
        manager.disconnect(user_id)


# --- ĐỀ XUẤT 3: KHÔI PHỤC PHIÊN BIỂU QUYẾT SAU SẬP NGUỒN SERVER ---
async def restore_active_sessions_on_startup():
    """Được gọi khi ứng dụng khởi động để nạp lại các phiên biểu quyết còn hiệu lực"""
    print("[Fault Tolerance] Đang khôi phục các phiên biểu quyết từ SQLite...")
    stored_sessions = get_all_temporary_sessions()
    current_time = time.time()
    
    count = 0
    for sess in stored_sessions:
        session_token = sess["session_token"]
        expires_at = sess["expires_at"]
        
        # Nếu phiên chưa hết thời gian đếm ngược
        if expires_at > current_time:
            remaining_seconds = int(expires_at - current_time)
            
            # Khôi phục trạng thái vào In-Memory RAM
            sess["status"] = "PENDING"
            ACTIVE_VOTING_SESSIONS[session_token] = sess
            
            # Khởi động lại task đếm ngược với thời gian còn lại
            asyncio.create_task(handle_session_timeout(session_token, remaining_seconds))
            count += 1
            print(f"[Fault Tolerance] Đã khôi phục phiên {session_token} cho Zone {sess['zone_id']} (Còn lại {remaining_seconds} giây).")
        else:
            # Xoá phiên đã quá hạn khi offline
            delete_temporary_session(session_token)
            
    print(f"[Fault Tolerance] Hoàn thành. Đã khôi phục thành công {count} phiên biểu quyết đang chờ.")


@router.get("/audit-logs")
async def get_audit_logs_api(limit: int = 100, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Bạn không có quyền xem nhật ký hoạt động hệ thống."
        )
    return get_audit_logs(limit)

