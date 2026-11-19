# -*- coding: utf-8 -*-
"""Chia sẻ khung hình tốc độ cao qua POSIX Shared Memory (/dev/shm) giữa FireGuard và FireEye."""
import struct
import time
from multiprocessing import resource_tracker, shared_memory
from typing import Optional, Tuple

import numpy as np

# Bỏ qua theo dõi shared_memory của resource_tracker để tránh việc reader vô tình unlink vùng nhớ khi thoát
try:
    orig_reg = resource_tracker.register
    def _reg(name, rtype):
        if rtype == "shared_memory":
            return
        return orig_reg(name, rtype)
    resource_tracker.register = _reg

    orig_unreg = resource_tracker.unregister
    def _unreg(name, rtype):
        if rtype == "shared_memory":
            return
        return orig_unreg(name, rtype)
    resource_tracker.unregister = _unreg
except Exception:
    pass

SHM_NAME = "ignivo_shared_frame"
HEADER_FMT = "=QdIII"
HEADER_SIZE = 64
MAX_FRAME_SIZE = 1920 * 1080 * 3
TOTAL_SHM_SIZE = HEADER_SIZE + MAX_FRAME_SIZE


class SharedFrameWriter:
    def __init__(self, name: str = SHM_NAME):
        self.name = name
        self.seq = 0
        self.shm: Optional[shared_memory.SharedMemory] = None
        self._ensure_shm()

    def _ensure_shm(self):
        if self.shm is not None:
            return
        try:
            self.shm = shared_memory.SharedMemory(name=self.name, create=True, size=TOTAL_SHM_SIZE)
        except FileExistsError:
            try:
                existing = shared_memory.SharedMemory(name=self.name)
                if existing.size != TOTAL_SHM_SIZE:
                    existing.close()
                    existing.unlink()
                    self.shm = shared_memory.SharedMemory(name=self.name, create=True, size=TOTAL_SHM_SIZE)
                else:
                    self.shm = existing
            except Exception:
                self.shm = None

    def write(self, frame: np.ndarray):
        if frame is None or not hasattr(frame, "shape"):
            return
        self._ensure_shm()
        if self.shm is None:
            return

        h, w = frame.shape[:2]
        c = frame.shape[2] if len(frame.shape) > 2 else 1
        data_size = h * w * c
        if data_size > MAX_FRAME_SIZE:
            return

        self.seq += 1
        now = time.time()
        header = struct.pack(HEADER_FMT, self.seq, now, h, w, c)
        try:
            self.shm.buf[:len(header)] = header
            if frame.flags.c_contiguous:
                self.shm.buf[HEADER_SIZE:HEADER_SIZE + data_size] = memoryview(frame.reshape(-1))
            else:
                self.shm.buf[HEADER_SIZE:HEADER_SIZE + data_size] = frame.tobytes()
        except Exception:
            try:
                if self.shm is not None:
                    self.shm.close()
            except Exception:
                pass
            self.shm = None

    def close(self):
        try:
            if self.shm is not None:
                self.shm.close()
                self.shm.unlink()
        except Exception:
            pass
        self.shm = None


class SharedFrameReader:
    def __init__(self, name: str = SHM_NAME):
        self.name = name
        self.shm: Optional[shared_memory.SharedMemory] = None
        self.last_seq = 0

    def read(self, max_age_s: float = 2.0) -> Tuple[bool, Optional[np.ndarray]]:
        try:
            if self.shm is None:
                self.shm = shared_memory.SharedMemory(name=self.name)

            header_bytes = bytes(self.shm.buf[:struct.calcsize(HEADER_FMT)])
            seq, ts, h, w, c = struct.unpack(HEADER_FMT, header_bytes)

            # Khung hình quá cũ hoặc kích thước không hợp lệ
            if (time.time() - ts) > max_age_s or h <= 0 or w <= 0:
                return False, None

            data_size = h * w * c
            if data_size > MAX_FRAME_SIZE:
                return False, None

            shape = (h, w, c) if c > 1 else (h, w)
            frame = np.ndarray(shape, dtype=np.uint8, buffer=self.shm.buf, offset=HEADER_SIZE).copy()
            self.last_seq = seq
            return True, frame
        except Exception:
            if self.shm is not None:
                try:
                    self.shm.close()
                except Exception:
                    pass
                self.shm = None
            return False, None

    def is_available(self, max_age_s: float = 2.0) -> bool:
        try:
            if self.shm is None:
                self.shm = shared_memory.SharedMemory(name=self.name)
            header_bytes = bytes(self.shm.buf[:struct.calcsize(HEADER_FMT)])
            seq, ts, h, w, c = struct.unpack(HEADER_FMT, header_bytes)
            return (time.time() - ts) <= max_age_s and h > 0 and w > 0
        except Exception:
            return False

    def close(self):
        if self.shm is not None:
            try:
                self.shm.close()
            except Exception:
                pass
            self.shm = None
