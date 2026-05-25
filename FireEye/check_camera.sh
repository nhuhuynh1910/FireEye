#!/bin/bash

# Đảm bảo script được chạy với quyền sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "\e[31m[!] Vui lòng chạy script này với quyền sudo: sudo bash check_camera.sh\e[0m"
  exit 1
fi

echo -e "\e[34m[*] Đang gán IP tĩnh 192.168.1.100/24 cho cổng end0...\e[0m"
# Kiểm tra xem IP đã được gán chưa
if ! ip addr show dev end0 | grep -q "192.168.1.100"; then
  ip addr add 192.168.1.100/24 dev end0
fi
ip link set end0 up

echo -e "\e[34m[*] Đang chờ 3 giây để cổng mạng ổn định...\e[0m"
sleep 3

# Hiển thị cấu hình mạng hiện tại của end0
echo -e "\e[32m[+] Cấu hình IP hiện tại của end0:\e[0m"
ip addr show dev end0 | grep -E "inet |link/"

# Thử ping tới IP mặc định của camera
CAMERA_IP="192.168.1.108"
echo -e "\e[34m[*] Đang ping thử tới camera tại địa chỉ $CAMERA_IP...\e[0m"
if ping -c 3 -W 2 $CAMERA_IP > /dev/null; then
  echo -e "\e[32m[+] Kết nối Ping thành công tới camera ($CAMERA_IP)!\e[0m"
  
  # Kiểm tra xem cổng RTSP (554) của camera có mở không
  echo -e "\e[34m[*] Đang kiểm tra cổng RTSP (cổng 554) của camera...\e[0m"
  if nc -zv -w 3 $CAMERA_IP 554 2>&1 | grep -q -E "succeeded|open|Connection to"; then
    echo -e "\e[32m[+] Cổng RTSP (554) đang MỞ. Kết nối LAN hoàn toàn hoạt động tốt!\e[0m"
  else
    echo -e "\e[31m[-] Cổng RTSP (554) bị ĐÓNG hoặc chặn. Hãy kiểm tra cấu hình RTSP trên camera.\e[0m"
  fi
else
  echo -e "\e[31m[-] Không thể ping tới camera ($CAMERA_IP).\e[0m"
  echo -e "\e[34m[*] Đang quét tìm các thiết bị kết nối trên cổng end0 (sử dụng arp-scan)...\e[0m"
  
  # Quét các thiết bị trong mạng LAN
  SCAN_RESULT=$(arp-scan --interface=end0 --localnet)
  echo "$SCAN_RESULT"
  
  if echo "$SCAN_RESULT" | grep -q -E "([0-9]{1,3}\.){3}[0-9]{1,3}"; then
    echo -e "\e[32m[+] Phát hiện thiết bị khác trong dải mạng. Vui lòng kiểm tra xem IP của camera có khác $CAMERA_IP không.\e[0m"
  else
    echo -e "\e[31m[-] Không phát hiện bất kỳ thiết bị nào qua cổng LAN.\e[0m"
    echo -e "\e[33m[!] Khuyến nghị: Kiểm tra nguồn của camera Dahua (đèn nguồn có sáng không) và đảm bảo cáp LAN đã cắm chặt vào Pi 5.\e[0m"
  fi
fi
