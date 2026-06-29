import os
import sys
from unittest.mock import MagicMock

# Ensure FireEye root is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Mock insightface which is only available on Raspberry Pi 5
insightface_mock = MagicMock()
insightface_app_mock = MagicMock()
sys.modules['insightface'] = insightface_mock
sys.modules['insightface.app'] = insightface_app_mock

class MockFaceAnalysis:
    def __init__(self, *args, **kwargs):
        pass
    def prepare(self, *args, **kwargs):
        pass
    def get(self, *args, **kwargs):
        return []

insightface_app_mock.FaceAnalysis = MockFaceAnalysis

from fastapi.testclient import TestClient
from main import app
from services.db_service import init_db, get_connection

def test_auth_and_user_crud():
    # 1. Initialize Database
    init_db()
    
    client = TestClient(app)
    
    # Clean up test users if they exist from prior tests
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE username IN ('admin', 'teststaff', 'updatedstaff') OR phone_number IN ('+84999999999', '+84123456789')")
    cursor.execute("DELETE FROM user_sessions")
    conn.commit()
    conn.close()
    
    # Trigger startup event to create default admin
    with client:
        # Check invalid System Key login failure
        print("[TEST] Logging in with default admin (incorrect system secret key)...")
        login_fail_res = client.post("/api/auth/login", json={
            "phone_number": "+84999999999",
            "secret_key": "adminpassword",
            "system_secret_key": "wrong_system_key",
            "device_name": "Device 1"
        })
        assert login_fail_res.status_code == 403, f"Expected 403 but got {login_fail_res.status_code}"
        assert "Mã khóa hệ thống không chính xác" in login_fail_res.json()["detail"]
        print("[PASS] Invalid system key login was successfully rejected.")

        # Check valid System Key login success
        print("[TEST] Logging in with default admin (correct system secret key)...")
        login_res = client.post("/api/auth/login", json={
            "phone_number": "+84999999999",
            "secret_key": "adminpassword",
            "system_secret_key": "default_server_secret_key_123456",
            "device_name": "Device 1"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        login_data = login_res.json()
        assert login_data["success"] is True
        assert login_data["user"]["phone_number"] == "+84999999999"
        assert login_data["user"]["role"] == "OWNER"
        assert login_data["user"]["is_first_login"] is True
        assert "token" in login_data
        print("[PASS] Admin logged in successfully.")
        
        token1 = login_data["token"]
        headers1 = {"Authorization": f"Bearer {token1}"}
        
        # Test /api/auth/me using Bearer header
        print("[TEST] Testing /api/auth/me...")
        me_res = client.get("/api/auth/me", headers=headers1)
        assert me_res.status_code == 200, f"/api/auth/me failed: {me_res.text}"
        me_data = me_res.json()
        assert me_data["phone_number"] == "+84999999999"
        assert me_data["role"] == "OWNER"
        print("[PASS] /api/auth/me works correctly.")
        
        # Test password change
        print("[TEST] Testing /api/auth/change-password...")
        change_res = client.post("/api/auth/change-password", json={
            "old_password": "adminpassword",
            "new_password": "NewAdminPassword123!"
        }, headers=headers1)
        assert change_res.status_code == 200, f"Password change failed: {change_res.text}"
        assert change_res.json()["success"] is True
        print("[PASS] Password changed successfully.")
        
        # Login again with new password
        print("[TEST] Logging in with new admin password...")
        login_res = client.post("/api/auth/login", json={
            "phone_number": "+84999999999",
            "secret_key": "NewAdminPassword123!",
            "system_secret_key": "default_server_secret_key_123456",
            "device_name": "Device 1"
        })
        assert login_res.status_code == 200
        token1 = login_res.json()["token"]
        headers1 = {"Authorization": f"Bearer {token1}"}
        print("[PASS] Logged in with new password.")
        
        # Create a new user (Staff) - test with incorrect system key first
        print("[TEST] Creating a new staff user (incorrect system secret key)...")
        create_fail_res = client.post("/api/users", json={
            "username": "teststaff",
            "password": "StaffPassword123!",
            "phone_number": "+84123456789",
            "system_secret_key": "wrong_system_key",
            "full_name": "Test Staff Member",
            "role": "STAFF"
        }, headers=headers1)
        assert create_fail_res.status_code == 403
        assert "Mã khóa hệ thống không chính xác" in create_fail_res.json()["detail"]
        print("[PASS] Invalid system key user creation was successfully rejected.")

        # Create a new user (Staff) - correct system key
        print("[TEST] Creating a new staff user (correct system secret key)...")
        create_res = client.post("/api/users", json={
            "username": "teststaff",
            "password": "StaffPassword123!",
            "phone_number": "+84123456789",
            "system_secret_key": "default_server_secret_key_123456",
            "full_name": "Test Staff Member",
            "role": "STAFF"
        }, headers=headers1)
        assert create_res.status_code == 200, f"Create user failed: {create_res.text}"
        assert create_res.json()["success"] is True
        print("[PASS] Staff user created successfully.")
        
        # List users
        print("[TEST] Listing all users...")
        list_res = client.get("/api/users", headers=headers1)
        assert list_res.status_code == 200
        users = list_res.json()
        assert len(users) >= 2
        staff_user = next(u for u in users if u["username"] == "teststaff")
        assert staff_user["full_name"] == "Test Staff Member"
        assert staff_user["role"] == "STAFF"
        print("[PASS] List users contains created user.")
        
        # Update user
        print("[TEST] Updating staff user...")
        update_res = client.put(f"/api/users/{staff_user['id']}", json={
            "full_name": "Updated Staff Name",
            "role": "STAFF",
            "password": "NewStaffPassword123!",
            "phone_number": "+84123456789"
        }, headers=headers1)
        assert update_res.status_code == 200
        assert update_res.json()["success"] is True
        print("[PASS] User updated successfully.")
        
        # Test active session limits (MAX_SESSIONS = 3)
        print("[TEST] Logging in on multiple devices to test active session limits...")
        
        # Login 2nd device
        login_res2 = client.post("/api/auth/login", json={
            "phone_number": "+84999999999",
            "secret_key": "NewAdminPassword123!",
            "system_secret_key": "default_server_secret_key_123456",
            "device_name": "Device 2"
        })
        assert login_res2.status_code == 200
        token2 = login_res2.json()["token"]
        headers2 = {"Authorization": f"Bearer {token2}"}
        
        # Login 3rd device
        login_res3 = client.post("/api/auth/login", json={
            "phone_number": "+84999999999",
            "secret_key": "NewAdminPassword123!",
            "system_secret_key": "default_server_secret_key_123456",
            "device_name": "Device 3"
        })
        assert login_res3.status_code == 200
        token3 = login_res3.json()["token"]
        headers3 = {"Authorization": f"Bearer {token3}"}
        
        # Verify all 3 devices can fetch /me
        assert client.get("/api/auth/me", headers=headers1).status_code == 200
        assert client.get("/api/auth/me", headers=headers2).status_code == 200
        assert client.get("/api/auth/me", headers=headers3).status_code == 200
        print("[PASS] 3 concurrent devices logged in and validated.")
        
        # Login 4th device (should invalidate Device 1)
        login_res4 = client.post("/api/auth/login", json={
            "phone_number": "+84999999999",
            "secret_key": "NewAdminPassword123!",
            "system_secret_key": "default_server_secret_key_123456",
            "device_name": "Device 4"
        })
        assert login_res4.status_code == 200
        token4 = login_res4.json()["token"]
        headers4 = {"Authorization": f"Bearer {token4}"}
        
        # Device 1 should be unauthorized now
        me_res1 = client.get("/api/auth/me", headers=headers1)
        assert me_res1.status_code == 401, f"Device 1 should be logged out, but got {me_res1.status_code}"
        print("[PASS] Device 1 successfully invalidated after Device 4 logged in.")
        
        # Devices 2, 3, 4 should still be active
        assert client.get("/api/auth/me", headers=headers2).status_code == 200
        assert client.get("/api/auth/me", headers=headers3).status_code == 200
        assert client.get("/api/auth/me", headers=headers4).status_code == 200
        print("[PASS] Devices 2, 3, 4 remain active.")
        
        # Delete user
        print("[TEST] Deleting staff user...")
        delete_res = client.delete(f"/api/users/{staff_user['id']}", headers=headers4)
        assert delete_res.status_code == 200
        assert delete_res.json()["success"] is True
        print("[PASS] User deleted successfully.")
        
        # Verify self-delete is forbidden
        print("[TEST] Verifying self-delete protection...")
        self_delete_res = client.delete(f"/api/users/{me_data['id']}", headers=headers4)
        assert self_delete_res.status_code == 400
        print("[PASS] Self-delete was successfully rejected.")
        
        # Log out Device 4
        print("[TEST] Logging out Device 4...")
        logout_res = client.post("/api/auth/logout", headers=headers4)
        assert logout_res.status_code == 200
        
        # Device 4 should now be unauthorized
        me_res4 = client.get("/api/auth/me", headers=headers4)
        assert me_res4.status_code == 401
        print("[PASS] Logged out Device 4 successfully.")
        
        # Restore admin password to default for development environment
        from services.auth_service import hash_password
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET password_hash = ? WHERE username = ?", (hash_password("adminpassword"), "admin"))
        conn.commit()
        conn.close()
        print("[INFO] Admin password restored to 'adminpassword' for local dev.")
        
        print("\n[ALL TESTS PASSED SUCCESSFULLY!]")

if __name__ == "__main__":
    test_auth_and_user_crud()
