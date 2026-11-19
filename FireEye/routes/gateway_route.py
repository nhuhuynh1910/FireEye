# -*- coding: utf-8 -*-
"""Unified Gateway Reverse Proxy: Hợp nhất toàn bộ API và UI của FireGuard và FireEye qua cổng duy nhất."""
import asyncio
import logging
from typing import Set

import httpx
import websockets
from fastapi import APIRouter, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import RedirectResponse, StreamingResponse

log = logging.getLogger("fireeye.gateway")

router = APIRouter(tags=["Unified Gateway"])

FIREGUARD_HTTP_BASE = "http://127.0.0.1:8080"
FIREGUARD_WS_BASE = "ws://127.0.0.1:8080"

# Async client dùng chung kết nối HTTP keep-alive cho hiệu năng tối đa
_proxy_client = httpx.AsyncClient(base_url=FIREGUARD_HTTP_BASE, timeout=60.0)

HOP_BY_HOP_HEADERS: Set[str] = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "content-length",
    "content-encoding",
    "host",
}


@router.get("/ui", include_in_schema=False)
def redirect_ui():
    return RedirectResponse(url="/ui/")


@router.api_route(
    "/ui/{path:path}",
    methods=["GET", "HEAD"],
    include_in_schema=False
)
async def proxy_fireguard_ui(request: Request, path: str):
    """Proxy giao diện Web UI của FireGuard qua cổng FireEye."""
    target_path = f"/ui/{path}"
    query = request.url.query
    if query:
        target_path = f"{target_path}?{query}"

    headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in HOP_BY_HOP_HEADERS
    }

    try:
        req = _proxy_client.build_request(
            method=request.method,
            url=target_path,
            headers=headers
        )
        resp = await _proxy_client.send(req, stream=True)
        resp_headers = {
            k: v for k, v in resp.headers.items()
            if k.lower() not in HOP_BY_HOP_HEADERS
        }
        return StreamingResponse(
            resp.aiter_raw(),
            status_code=resp.status_code,
            headers=resp_headers,
            background=resp.aclose
        )
    except Exception as e:
        log.warning("Lỗi proxy FireGuard UI: %s", e)
        return Response(status_code=502, content=f"FireGuard UI Unavailable: {e}")


@router.api_route(
    "/api/v1/emergency/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    include_in_schema=False
)
async def proxy_emergency_api(request: Request, path: str):
    """Proxy toàn bộ REST API cứu hộ / sự cố của FireGuard qua cổng FireEye."""
    target_path = f"/api/v1/emergency/{path}"
    query = request.url.query
    if query:
        target_path = f"{target_path}?{query}"

    headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in HOP_BY_HOP_HEADERS
    }
    body = await request.body()

    try:
        req = _proxy_client.build_request(
            method=request.method,
            url=target_path,
            headers=headers,
            content=body
        )
        resp = await _proxy_client.send(req, stream=True)
        resp_headers = {
            k: v for k, v in resp.headers.items()
            if k.lower() not in HOP_BY_HOP_HEADERS
        }
        return StreamingResponse(
            resp.aiter_raw(),
            status_code=resp.status_code,
            headers=resp_headers,
            background=resp.aclose
        )
    except Exception as e:
        log.error("Lỗi proxy FireGuard API: %s", e)
        return Response(
            status_code=502,
            content=f'{{"detail": "FireGuard Gateway Error: {type(e).__name__}: {str(e)}"}}',
            media_type="application/json"
        )


@router.websocket("/api/v1/emergency/ws")
async def proxy_emergency_websocket(client_ws: WebSocket):
    """Proxy WebSocket realtime sự cố của FireGuard qua cổng FireEye."""
    await client_ws.accept()
    query = client_ws.url.query
    target_url = f"{FIREGUARD_WS_BASE}/api/v1/emergency/ws"
    if query:
        target_url = f"{target_url}?{query}"

    try:
        async with websockets.connect(target_url) as fg_ws:
            async def forward_client_to_fg():
                try:
                    while True:
                        msg = await client_ws.receive_text()
                        await fg_ws.send(msg)
                except (WebSocketDisconnect, asyncio.CancelledError):
                    pass

            async def forward_fg_to_client():
                try:
                    async for msg in fg_ws:
                        await client_ws.send_text(msg)
                except (WebSocketDisconnect, asyncio.CancelledError):
                    pass

            t1 = asyncio.create_task(forward_client_to_fg())
            t2 = asyncio.create_task(forward_fg_to_client())
            done, pending = await asyncio.wait([t1, t2], return_when=asyncio.FIRST_COMPLETED)
            for task in pending:
                task.cancel()
    except Exception as e:
        log.warning("WebSocket proxy đóng kết nối: %s", e)
    finally:
        try:
            await client_ws.close()
        except Exception:
            pass
