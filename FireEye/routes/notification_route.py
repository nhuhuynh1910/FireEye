from fastapi import APIRouter

from services.db_service import (
    get_notifications,
    get_unread_notification_count,
    mark_notification_as_read
)

router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"]
)


@router.get("")
def notifications():

    data = get_notifications()

    return {
        "success": True,
        "count": len(data),
        "data": data
    }


@router.get("/unread-count")
def unread_count():

    total = get_unread_notification_count()

    return {
        "success": True,
        "unread": total
    }


@router.post("/{event_id}/read")
def mark_read(event_id: int):

    mark_notification_as_read(event_id)

    return {
        "success": True,
        "message": "Đã đánh dấu đã đọc"
    }