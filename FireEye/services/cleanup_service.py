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


def cleanup_old_snapshots(days: int = KEEP_DAYS):
    cutoff_time = datetime.now() - timedelta(days=days)
    deleted_count = 0

    if not SNAPSHOT_DIR.exists():
        return 0

    for file_path in SNAPSHOT_DIR.glob("*.jpg"):
        modified_time = datetime.fromtimestamp(
            file_path.stat().st_mtime
        )

        if modified_time < cutoff_time:
            file_path.unlink()
            deleted_count += 1

    return deleted_count


def run_cleanup_once():
    deleted_events = cleanup_old_events(KEEP_DAYS)
    deleted_snapshots = cleanup_old_snapshots(KEEP_DAYS)

    return {
        "deleted_events": deleted_events,
        "deleted_snapshots": deleted_snapshots,
        "keep_days": KEEP_DAYS
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
        return

    _cleanup_running = True

    _cleanup_thread = threading.Thread(
        target=_cleanup_loop,
        daemon=True
    )

    _cleanup_thread.start()