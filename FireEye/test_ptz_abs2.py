import requests
from requests.auth import HTTPDigestAuth
from config.settings import DAHUA_BASE_URL, CAMERA_USERNAME, CAMERA_PASSWORD, PTZ_CHANNEL

url = f"{DAHUA_BASE_URL}/cgi-bin/ptz.cgi?action=start&channel={PTZ_CHANNEL}&code=PositionABS&arg1=900&arg2=0&arg3=0"
auth = HTTPDigestAuth(CAMERA_USERNAME, CAMERA_PASSWORD)

response = requests.get(url, auth=auth)
print(f"URL: {url}")
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
