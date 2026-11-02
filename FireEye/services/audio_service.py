# -*- coding: utf-8 -*-
import os
import shutil
import subprocess
import threading
import time
from typing import Optional


class AudioService:
    def __init__(self):
        self.lock = threading.Lock()
        self._alarm_process: Optional[subprocess.Popen] = None
        self._alarm_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._alarm_active = False
        self._expire_time: float = 0.0

        # Sound assets directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.static_sounds_dir = os.path.join(current_dir, "..", "static", "sounds")
        os.makedirs(self.static_sounds_dir, exist_ok=True)

        self.alarm_sound_path = os.path.join(self.static_sounds_dir, "fire_alarm.wav")
        self.beep_sound_path = os.path.join(self.static_sounds_dir, "beep.wav")

        self.player_bin = self._resolve_player()

    def _resolve_player(self) -> Optional[str]:
        """Detect available player binary (pw-play, aplay, or ffplay)."""
        for bin_name in ["pw-play", "aplay", "ffplay"]:
            path = shutil.which(bin_name)
            if path:
                return path
        return None

    def _get_player_env(self) -> dict:
        """Ensure XDG_RUNTIME_DIR is populated for PipeWire connectivity."""
        env = os.environ.copy()
        if "XDG_RUNTIME_DIR" not in env:
            try:
                uid = os.getuid()
                runtime_dir = f"/run/user/{uid}"
                if os.path.exists(runtime_dir):
                    env["XDG_RUNTIME_DIR"] = runtime_dir
            except Exception:
                pass
        return env

    def is_alarm_active(self) -> bool:
        return self._alarm_active

    def start_alarm(self, duration: float = 15.0) -> bool:
        """
        Start playing the fire alarm siren on the Pi speaker.
        If already sounding, extend the duration safely without overlapping.
        """
        if not self.player_bin:
            print("[AudioService] No audio player found on system (pw-play/aplay/ffplay).")
            return False

        if not os.path.exists(self.alarm_sound_path):
            print(f"[AudioService] Alarm sound file missing: {self.alarm_sound_path}")
            return False

        with self.lock:
            self._expire_time = time.time() + max(1.0, float(duration))
            if self._alarm_active:
                # Already active, duration extended
                return True

            self._alarm_active = True
            self._stop_event.clear()
            self._alarm_thread = threading.Thread(target=self._alarm_loop_worker, daemon=True)
            self._alarm_thread.start()
            print(f"[AudioService] Alarm siren STARTED (duration={duration}s).")
            return True

    def _alarm_loop_worker(self):
        """Background worker looping the siren until timeout or stop signal."""
        env = self._get_player_env()
        cmd = [self.player_bin, self.alarm_sound_path]
        if "ffplay" in self.player_bin:
            cmd = [self.player_bin, "-nodisp", "-autoexit", "-loglevel", "quiet", self.alarm_sound_path]

        while not self._stop_event.is_set():
            if time.time() >= self._expire_time:
                break

            try:
                proc = subprocess.Popen(
                    cmd,
                    env=env,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                with self.lock:
                    self._alarm_process = proc

                # Wait for sound snippet to finish playing or stop event
                while proc.poll() is None:
                    if self._stop_event.is_set() or time.time() >= self._expire_time:
                        try:
                            proc.terminate()
                            proc.wait(timeout=1.0)
                        except Exception:
                            proc.kill()
                        break
                    time.sleep(0.1)

            except Exception as e:
                print(f"[AudioService] Error during alarm playback: {e}")
                break

        with self.lock:
            self._alarm_active = False
            self._alarm_process = None
        print("[AudioService] Alarm siren STOPPED.")

    def stop_alarm(self) -> bool:
        """Immediately stop alarm siren."""
        with self.lock:
            if not self._alarm_active:
                return True

            self._stop_event.set()
            self._expire_time = 0.0
            if self._alarm_process:
                try:
                    self._alarm_process.terminate()
                    self._alarm_process.wait(timeout=1.0)
                except Exception:
                    try:
                        self._alarm_process.kill()
                    except Exception:
                        pass
                self._alarm_process = None

            self._alarm_active = False
            print("[AudioService] Alarm siren force stopped.")
            return True

    def play_test_tone(self) -> bool:
        """Play short test beep asynchronously."""
        if not self.player_bin or not os.path.exists(self.beep_sound_path):
            return False

        def _play():
            env = self._get_player_env()
            cmd = [self.player_bin, self.beep_sound_path]
            if "ffplay" in self.player_bin:
                cmd = [self.player_bin, "-nodisp", "-autoexit", "-loglevel", "quiet", self.beep_sound_path]
            try:
                subprocess.run(cmd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5)
            except Exception as e:
                print(f"[AudioService] Test tone error: {e}")

        t = threading.Thread(target=_play, daemon=True)
        t.start()
        return True

    def set_volume(self, level: float) -> bool:
        """Set output volume (0.0 to 1.0) using wpctl."""
        level = max(0.0, min(1.0, float(level)))
        wpctl_bin = shutil.which("wpctl")
        if not wpctl_bin:
            return False

        env = self._get_player_env()
        try:
            res = subprocess.run(
                [wpctl_bin, "set-volume", "@DEFAULT_AUDIO_SINK@", f"{level:.2f}"],
                env=env,
                capture_output=True,
                text=True,
                timeout=3
            )
            return res.returncode == 0
        except Exception as e:
            print(f"[AudioService] Volume adjust error: {e}")
            return False

    def get_status(self) -> dict:
        """Get speaker / audio status dictionary."""
        volume = None
        wpctl_bin = shutil.which("wpctl")
        if wpctl_bin:
            try:
                env = self._get_player_env()
                res = subprocess.run(
                    [wpctl_bin, "get-volume", "@DEFAULT_AUDIO_SINK@"],
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=2
                )
                if res.returncode == 0 and "Volume:" in res.stdout:
                    parts = res.stdout.strip().split()
                    if len(parts) >= 2:
                        volume = float(parts[1])
            except Exception:
                pass

        return {
            "speaker_connected": True,
            "device_hardware": "MAX98357A I2S DAC",
            "player_backend": self.player_bin or "none",
            "alarm_active": self._alarm_active,
            "volume": volume,
            "sounds_available": {
                "alarm": os.path.exists(self.alarm_sound_path),
                "beep": os.path.exists(self.beep_sound_path)
            }
        }


audio_service = AudioService()

