# -*- coding: utf-8 -*-
import os
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath("FireEye/FireEye"))

from services.audio_service import audio_service


def test_audio():
    print("=== KIỂM TRA AUDIO SERVICE & PHẦN CỨNG LOA PI 5 ===")

    # 1. Trạng thái service
    status = audio_service.get_status()
    print("1. Trạng thái kết nối loa:", status)
    assert status["speaker_connected"] is True
    assert status["sounds_available"]["alarm"] is True
    assert status["sounds_available"]["beep"] is True
    print("   [OK] Audio Service nhận diện phần cứng DAC và tệp âm thanh đầy đủ.")

    # 2. Test tone (Beep)
    print("2. Phát thử âm thông báo ngắn (test tone)...")
    res_tone = audio_service.play_test_tone()
    assert res_tone is True
    print("   [OK] Lệnh phát test tone chạy thành công.")

    # 3. Kích hoạt còi hú báo cháy (Alarm)
    print("3. Kích hoạt còi hú báo cháy (duration=2.0s)...")
    res_alarm = audio_service.start_alarm(duration=2.0)
    assert res_alarm is True
    time.sleep(0.5)
    assert audio_service.is_alarm_active() is True
    print("   [OK] Còi hú đang phát ở chế độ background.")

    # 4. Tắt còi hú thủ công
    print("4. Dừng còi hú thủ công...")
    res_stop = audio_service.stop_alarm()
    assert res_stop is True
    assert audio_service.is_alarm_active() is False
    print("   [OK] Đã tắt còi hú thành công.")

    print("\n=== TẤT CẢ KIỂM TRA AUDIO ĐÃ VƯỢT QUA 100% ===")


if __name__ == "__main__":
    test_audio()

