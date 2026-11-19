import shutil
import time
import threading
from pathlib import Path
from datetime import datetime, timedelta

from services.db_service import cleanup_old_events

_cleanup_thread = None
_cleanup_running = False

SNAPSHOT_DIR = Path("static/snapshots")
KEEP_DAYS = 7
CHECK_INTERVAL_SECONDS = 3600
DISK_EMERGENCY_FREE_PERCENT = 15.0  # Ngưỡng dung lượng trống khẩn cấp (%)


def cleanup_old_snapshots(days: int = KEEP_DAYS):
    cutoff_time = datetime.now() - timedelta(days=days)
    deleted_count = 0

    if not SNAPSHOT_DIR.exists():
        return 0

    for file_path in SNAPSHOT_DIR.glob("*.jpg"):
        try:
            modified_time = datetime.fromtimestamp(
                file_path.stat().st_mtime
            )

            if modified_time < cutoff_time:
                file_path.unlink(missing_ok=True)
                deleted_count += 1
        except Exception:
            pass

    return deleted_count


def check_and_emergency_cleanup():
    """Kiểm tra dung lượng ổ đĩa. Nếu dung lượng trống < 15%, tự động dọn dẹp các snapshot/event cũ hơn 2 ngày."""
    try:
        target_dir = SNAPSHOT_DIR if SNAPSHOT_DIR.exists() else Path(".")
        usage = shutil.disk_usage(target_dir)
        free_pct = (usage.free / usage.total) * 100.0

        if free_pct < DISK_EMERGENCY_FREE_PERCENT:
            print(f"[CẢNH BÁO LƯU TRỮ] Dung lượng đĩa trống thấp ({free_pct:.1f}% < {DISK_EMERGENCY_FREE_PERCENT}%). Kích hoạt dọn dẹp khẩn cấp...")
            deleted_events = cleanup_old_events(days=2)
            deleted_snaps = cleanup_old_snapshots(days=2)
            return {
                "emergency": True,
                "free_percent": round(free_pct, 1),
                "deleted_events": deleted_events,
                "deleted_snapshots": deleted_snaps
            }
        return {"emergency": False, "free_percent": round(free_pct, 1)}
    except Exception as e:
        print("Lỗi kiểm tra dung lượng ổ đĩa:", e)
        return {"emergency": False, "error": str(e)}


def run_cleanup_once():
    disk_status = check_and_emergency_cleanup()
    if disk_status.get("emergency"):
        return disk_status

    deleted_events = cleanup_old_events(KEEP_DAYS)
    deleted_snapshots = cleanup_old_snapshots(KEEP_DAYS)

    return {
        "deleted_events": deleted_events,
        "deleted_snapshots": deleted_snapshots,
        "keep_days": KEEP_DAYS,
        "disk_free_percent": disk_status.get("free_percent")
    }


def _cleanup_loop():
    global _cleanup_running

    while _cleanup_running:
        try:
            result = run_cleanup_once()
            print("Cleanup result:", result)
        except Exception as e:
            print("Cleanup error:", e)

        time.sleep(CHECK_INTERVAL_SECONDS)


def start_cleanup_worker():
    global _cleanup_thread, _cleanup_running

    if _cleanup_running:
        return {
            "success": True,
            "message": "Cleanup worker đang chạy"
        }

    _cleanup_running = True

    _cleanup_thread = threading.Thread(
        target=_cleanup_loop,
        daemon=True
    )

    _cleanup_thread.start()

    return {
        "success": True,
        "message": "Đã bật cleanup worker"
    }


def stop_cleanup_worker():
    global _cleanup_running

    _cleanup_running = False

    return {
        "success": True,
        "message": "Đã tắt cleanup worker"
    }
