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
    cursor.execute("DELETE FROM users WHERE username IN ('admin', 'teststaff', 'updatedstaff')")
    conn.commit()
    conn.close()
    
    # Trigger startup event to create default admin
    # FastAPI test client context manager triggers startup/shutdown events
    with client:
        # Check if default admin exists
        print("[TEST] Logging in with default admin...")
        login_res = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "adminpassword"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        login_data = login_res.json()
        assert login_data["success"] is True
        assert login_data["user"]["username"] == "admin"
        assert login_data["user"]["role"] == "ADMIN"
        assert login_data["user"]["is_first_login"] is True
        print("[PASS] Admin logged in successfully.")
        
        # Save cookies
        cookies = login_res.cookies
        
        # Test /api/auth/me
        print("[TEST] Testing /api/auth/me...")
        me_res = client.get("/api/auth/me", cookies=cookies)
        assert me_res.status_code == 200, f"/api/auth/me failed: {me_res.text}"
        me_data = me_res.json()
        assert me_data["username"] == "admin"
        assert me_data["role"] == "ADMIN"
        assert me_data["is_first_login"] is True
        print("[PASS] /api/auth/me works correctly.")
        
        # Test password change
        print("[TEST] Testing /api/auth/change-password...")
        change_res = client.post("/api/auth/change-password", json={
            "old_password": "adminpassword",
            "new_password": "newadminpassword"
        }, cookies=cookies)
        assert change_res.status_code == 200, f"Password change failed: {change_res.text}"
        assert change_res.json()["success"] is True
        print("[PASS] Password changed successfully.")
        
        # Login again with new password
        print("[TEST] Logging in with new admin password...")
        login_res = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "newadminpassword"
        })
        assert login_res.status_code == 200
        assert login_res.json()["user"]["is_first_login"] is False
        cookies = login_res.cookies
        print("[PASS] Logged in with new password. First login flag is now False.")
        
        # Create a new user (Staff)
        print("[TEST] Creating a new staff user...")
        create_res = client.post("/api/users", json={
            "username": "teststaff",
            "password": "staffpassword",
            "full_name": "Test Staff Member",
            "role": "STAFF"
        }, cookies=cookies)
        assert create_res.status_code == 200, f"Create user failed: {create_res.text}"
        assert create_res.json()["success"] is True
        print("[PASS] Staff user created successfully.")
        
        # List users
        print("[TEST] Listing all users...")
        list_res = client.get("/api/users", cookies=cookies)
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
            "password": "newstaffpassword"
        }, cookies=cookies)
        assert update_res.status_code == 200
        assert update_res.json()["success"] is True
        print("[PASS] User updated successfully.")
        
        # Delete user
        print("[TEST] Deleting staff user...")
        delete_res = client.delete(f"/api/users/{staff_user['id']}", cookies=cookies)
        assert delete_res.status_code == 200
        assert delete_res.json()["success"] is True
        print("[PASS] User deleted successfully.")
        
        # Verify self-delete is forbidden
        print("[TEST] Verifying self-delete protection...")
        self_delete_res = client.delete(f"/api/users/{me_data['id']}", cookies=cookies)
        assert self_delete_res.status_code == 400
        print("[PASS] Self-delete was successfully rejected.")
        
        # Log out
        print("[TEST] Logging out...")
        logout_res = client.post("/api/auth/logout", cookies=cookies)
        assert logout_res.status_code == 200
        print("[PASS] Logged out successfully.")
        
        print("\n[ALL TESTS PASSED SUCCESSFULLY!]")

if __name__ == "__main__":
    test_auth_and_user_crud()
