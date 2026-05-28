/* services/api.js */

const API_BASE_URL = typeof window !== 'undefined' 
    ? `http://${window.location.hostname}:8000` 
    : "http://127.0.0.1:8000";

export const api = {
    /**
     * Fetch the Dahua camera status
     */
    async getCameraStatus() {
        const response = await fetch(`${API_BASE_URL}/api/camera/status`);
        if (!response.ok) throw new Error("Failed to fetch camera status");
        return response.json();
    },

    /**
     * Fetch the Hailo NPU / AI status
     */
    async getAIStatus() {
        const response = await fetch(`${API_BASE_URL}/api/ai/status`);
        if (!response.ok) throw new Error("Failed to fetch AI status");
        return response.json();
    },

    /**
     * Fetch the custom IoT sensor readings
     */
    async getSensors() {
        const response = await fetch(`${API_BASE_URL}/api/sensors`);
        if (!response.ok) throw new Error("Failed to fetch sensor readings");
        return response.json();
    },

    /**
     * Send PTZ command to camera
     * @param {string} action - 'up' | 'down' | 'left' | 'right' | 'zoom-in' | 'zoom-out' | 'stop'
     * @param {object} body - JSON payload (e.g. { code: 'left' } for stop)
     */
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

    /**
     * Helper to get stream URL
     */
    getStreamUrl() {
        return `${API_BASE_URL}/api/camera/stream`;
    }
};
