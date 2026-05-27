from fastapi import APIRouter, Query
from services.db_service import get_events

router = APIRouter(prefix="/api/events", tags=["Events"])


@router.get("")
def list_events(limit: int = Query(50, ge=1, le=200)):
    events = get_events(limit)
    return {
        "status": "success",
        "count": len(events),
        "data": events
    }