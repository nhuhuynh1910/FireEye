/* services/api.js - Mobile API Handler */

// NOTE: 127.0.0.1/localhost will not work on a physical phone.
// Set this to the actual LAN IP address of your Raspberry Pi 5.
const RASPBERRY_PI_IP = "192.168.1.100"; 
const API_BASE_URL = `http://${RASPBERRY_PI_IP}:5000`;

export const api = {
    async getCameraStatus() {
        const response = await fetch(`${API_BASE_URL}/api/camera/status`);
        if (!response.ok) throw new Error("Failed to fetch camera status");
        return response.json();
    },

    async getAIStatus() {
        const response = await fetch(`${API_BASE_URL}/api/ai/status`);
        if (!response.ok) throw new Error("Failed to fetch AI status");
        return response.json();
    },

    async getSensors() {
        const response = await fetch(`${API_BASE_URL}/api/sensors`);
        if (!response.ok) throw new Error("Failed to fetch sensor readings");
        return response.json();
    },

    async sendPTZCommand(action, body = {}) {
        const response = await fetch(`${API_BASE_URL}/api/camera/${action}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error(`PTZ command ${action} failed`);
        return response.json();
    },

    getStreamUrl() {
        return `${API_BASE_URL}/api/camera/stream`;
    }
};
