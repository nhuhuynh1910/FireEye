/* services/api.js */

const API_BASE_URL = typeof window !== 'undefined' 
    ? `http://${window.location.hostname}:8000` 
    : "http://127.0.0.1:8000";

export const api = {
    /**
     * Helper to get stream URL
     */
    getStreamUrl() {
        return `${API_BASE_URL}/api/camera/stream`;
    },

    /**
     * Fetch overall system status (camera, NPU, sensors, sprinkler)
     */
    async getSystemStatus() {
        const response = await fetch(`${API_BASE_URL}/api/status`);
        if (!response.ok) throw new Error("Failed to fetch system status");
        return response.json();
    },

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
     * Send PTZ command to Dahua camera
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
     * Control the sprinkler state (ON / OFF)
     */
    async controlSprinkler(action) {
        const response = await fetch(`${API_BASE_URL}/api/sprinkler/control`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ action })
        });
        if (!response.ok) throw new Error(`Failed to set sprinkler to ${action}`);
        return response.json();
    },

    /**
     * Fetch AI event log history
     */
    async getEvents(limit = 50) {
        const response = await fetch(`${API_BASE_URL}/api/events?limit=${limit}`);
        if (!response.ok) throw new Error("Failed to fetch events");
        return response.json();
    },

    /**
     * List registered people in Face Matching system
     */
    async getPeople() {
        const response = await fetch(`${API_BASE_URL}/api/faces/people`);
        if (!response.ok) throw new Error("Failed to fetch registered people");
        return response.json();
    },

    /**
     * Register a new face with avatar
     */
    async registerFace(name, role, imageFile) {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("role", role);
        formData.append("image", imageFile);

        const response = await fetch(`${API_BASE_URL}/api/faces/register`, {
            method: "POST",
            body: formData
        });
        if (!response.ok) throw new Error("Failed to register face");
        return response.json();
    },

    /**
     * Match face from live Dahua camera snapshot
     */
    async matchCameraFace() {
        const response = await fetch(`${API_BASE_URL}/api/faces/match-camera`);
        if (!response.ok) throw new Error("Failed to match camera face");
        return response.json();
    },

    /**
     * Match face by uploading an image
     */
    async matchFaceImage(imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);

        const response = await fetch(`${API_BASE_URL}/api/faces/match`, {
            method: "POST",
            body: formData
        });
        if (!response.ok) throw new Error("Failed to match face image");
        return response.json();
    },

    /**
     * Update simulated sensor values
     */
    async updateSensors(data) {
        const response = await fetch(`${API_BASE_URL}/api/sensors/update`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                smokeDetected: data.smokeDetected || false,
                flameDetected: data.flameDetected || false,
                smokeValue: data.smokeValue || 0,
                flameValue: data.flameValue || 0,
                node: data.node || "Node-1"
            })
        });
        if (!response.ok) throw new Error("Failed to update sensor states");
        return response.json();
    },

    /**
     * Trigger simulated AI detection (fire/smoke/human)
     */
    async triggerAIDetect(data) {
        const response = await fetch(`${API_BASE_URL}/api/ai/detect`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fire: data.fire || false,
                smoke: data.smoke || false,
                human: data.human || false,
                confidence: data.confidence || 0.0
            })
        });
        if (!response.ok) throw new Error("Failed to update AI detection");
        return response.json();
    },

    /**
     * Get MQTT status
     */
    async getMQTTStatus() {
        const response = await fetch(`${API_BASE_URL}/api/mqtt/status`);
        if (!response.ok) throw new Error("Failed to fetch MQTT status");
        return response.json();
    },

    /**
     * Get Sprinkler status
     */
    async getSprinklerStatus() {
        const response = await fetch(`${API_BASE_URL}/api/sprinkler/status`);
        if (!response.ok) throw new Error("Failed to fetch Sprinkler status");
        return response.json();
    },

    /**
     * Start automatic face watching worker
     */
    async startFaceWatch() {
        const response = await fetch(`${API_BASE_URL}/api/faces/watch/start`, {
            method: "POST"
        });
        if (!response.ok) throw new Error("Failed to start face watch worker");
        return response.json();
    },

    /**
     * Stop automatic face watching worker
     */
    async stopFaceWatch() {
        const response = await fetch(`${API_BASE_URL}/api/faces/watch/stop`, {
            method: "POST"
        });
        if (!response.ok) throw new Error("Failed to stop face watch worker");
        return response.json();
    },

    /**
     * Get automatic face watching worker status
     */
    async getFaceWatchStatus() {
        const response = await fetch(`${API_BASE_URL}/api/faces/watch/status`);
        if (!response.ok) throw new Error("Failed to fetch face watch status");
        return response.json();
    },

    /**
     * Get notifications logs
     */
    async getNotifications() {
        const response = await fetch(`${API_BASE_URL}/api/notifications`);
        if (!response.ok) throw new Error("Failed to fetch notifications");
        return response.json();
    },

    /**
     * Get unread notifications count
     */
    async getUnreadNotificationCount() {
        const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`);
        if (!response.ok) throw new Error("Failed to fetch unread notification count");
        return response.json();
    },

    /**
     * Mark a specific notification as read
     */
    async markNotificationAsRead(eventId) {
        const response = await fetch(`${API_BASE_URL}/api/notifications/${eventId}/read`, {
            method: "POST"
        });
        if (!response.ok) throw new Error("Failed to mark notification as read");
        return response.json();
    }
};
