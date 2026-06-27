/* services/api.js */

export const BACKEND_IP = import.meta.env.VITE_BACKEND_IP || (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1');
export const API_BASE_URL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : `http://${BACKEND_IP}:8000`;

const request = async (url, options = {}) => {
    options.credentials = 'include'; // Ensure cookies are sent
    options.headers = options.headers || {};
    
    if (!(options.body instanceof FormData)) {
        options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
    }

    try {
        let response = await fetch(url, options);

        if (response.status === 401) {
            // If the failure was on login or refresh itself, don't loop
            if (url.includes('/api/auth/login') || url.includes('/api/auth/refresh') || url.includes('/api/auth/me')) {
                throw new Error("Unauthorized");
            }

            // Attempt to refresh the access token
            const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                method: 'POST',
                credentials: 'include'
            });

            if (refreshRes.ok) {
                // Retry the original request
                response = await fetch(url, options);
            } else {
                // If refresh fails, notify the UI to logout/redirect
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('auth-unauthorized'));
                }
                throw new Error("Session expired. Please log in again.");
            }
        }

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Request failed with status ${response.status}`);
        }

        return response.json();
    } catch (err) {
        console.error("API error:", err);
        throw err;
    }
};

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
        return request(`${API_BASE_URL}/api/status`);
    },

    /**
     * Fetch the Dahua camera status
     */
    async getCameraStatus() {
        return request(`${API_BASE_URL}/api/camera/status`);
    },

    /**
     * Fetch the Hailo NPU / AI status
     */
    async getAIStatus() {
        return request(`${API_BASE_URL}/api/ai/status`);
    },

    /**
     * Fetch the custom IoT sensor readings
     */
    async getSensors() {
        return request(`${API_BASE_URL}/api/sensors`);
    },

    /**
     * Send PTZ command to Dahua camera
     * @param {string} action - 'up' | 'down' | 'left' | 'right' | 'zoom-in' | 'zoom-out' | 'stop'
     * @param {object} body - JSON payload (e.g. { code: 'left' } for stop)
     */
    async sendPTZCommand(action, body = {}) {
        return request(`${API_BASE_URL}/api/camera/${action}`, {
            method: "POST",
            body: JSON.stringify(body)
        });
    },

    /**
     * Move camera to a specific zone (1 to 4)
     */
    async moveToZone(zoneId) {
        return request(`${API_BASE_URL}/api/camera/zone/${zoneId}`, {
            method: "POST"
        });
    },

    /**
     * Move camera to the home preset
     */
    async goHome() {
        return request(`${API_BASE_URL}/api/camera/home`, {
            method: "POST"
        });
    },

    /**
     * Save current camera position as the home preset
     */
    async setHome() {
        return request(`${API_BASE_URL}/api/camera/set-home`, {
            method: "POST"
        });
    },

    /**
     * Save current camera position as the preset for a specific zone
     */
    async setZonePreset(zoneId) {
        return request(`${API_BASE_URL}/api/camera/zone/${zoneId}/set`, {
            method: "POST"
        });
    },

    /**
     * Control the sprinkler state (ON / OFF)
     */
    async controlSprinkler(action) {
        return request(`${API_BASE_URL}/api/sprinkler/control`, {
            method: "POST",
            body: JSON.stringify({ action })
        });
    },

    async acceptSprinkler(zoneId) {
        return request(`${API_BASE_URL}/api/sprinkler/zone/${zoneId}/accept`, {
            method: "POST"
        });
    },

    async rejectSprinkler(zoneId) {
        return request(`${API_BASE_URL}/api/sprinkler/zone/${zoneId}/reject`, {
            method: "POST"
        });
    },

    /**
     * Fetch AI event log history
     */
    async getEvents(limit = 50) {
        return request(`${API_BASE_URL}/api/events?limit=${limit}`);
    },

    /**
     * List registered people in Face Matching system
     */
    async getPeople() {
        return request(`${API_BASE_URL}/api/faces/people`);
    },

    /**
     * Register a new face with avatar
     */
    async registerFace(name, role, imageFile) {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("role", role);
        formData.append("image", imageFile);

        return request(`${API_BASE_URL}/api/faces/register`, {
            method: "POST",
            body: formData
        });
    },

    /**
     * Register a new face directly from Dahua camera snapshot
     */
    async registerFaceFromCamera(name, role) {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("role", role);

        return request(`${API_BASE_URL}/api/faces/register-camera`, {
            method: "POST",
            body: formData
        });
    },

    /**
     * Match face from live Dahua camera snapshot
     */
    async matchCameraFace() {
        return request(`${API_BASE_URL}/api/faces/match-camera`);
    },

    /**
     * Match face by uploading an image
     */
    async matchFaceImage(imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);

        return request(`${API_BASE_URL}/api/faces/match`, {
            method: "POST",
            body: formData
        });
    },

    /**
     * Update simulated sensor values
     */
    async updateSensors(data) {
        return request(`${API_BASE_URL}/api/sensors/update`, {
            method: "POST",
            body: JSON.stringify({
                smokeDetected: data.smokeDetected || false,
                flameDetected: data.flameDetected || false,
                smokeValue: data.smokeValue || 0,
                flameValue: data.flameValue || 0,
                node: data.node || "Node-1"
            })
        });
    },

    /**
     * Trigger simulated AI detection (fire/smoke/human)
     */
    async triggerAIDetect(data) {
        return request(`${API_BASE_URL}/api/ai/detect`, {
            method: "POST",
            body: JSON.stringify({
                fire: data.fire || false,
                smoke: data.smoke || false,
                human: data.human || false,
                confidence: data.confidence || 0.0,
                bbox: data.bbox || null
            })
        });
    },

    /**
     * Get MQTT status
     */
    async getMQTTStatus() {
        return request(`${API_BASE_URL}/api/mqtt/status`);
    },

    /**
     * Get Sprinkler status
     */
    async getSprinklerStatus() {
        return request(`${API_BASE_URL}/api/sprinkler/status`);
    },

    /**
     * Start automatic face watching worker
     */
    async startFaceWatch() {
        return request(`${API_BASE_URL}/api/faces/watch/start`, {
            method: "POST"
        });
    },

    /**
     * Stop automatic face watching worker
     */
    async stopFaceWatch() {
        return request(`${API_BASE_URL}/api/faces/watch/stop`, {
            method: "POST"
        });
    },

    /**
     * Get automatic face watching worker status
     */
    async getFaceWatchStatus() {
        return request(`${API_BASE_URL}/api/faces/watch/status`);
    },

    /**
     * Get notifications logs
     */
    async getNotifications() {
        return request(`${API_BASE_URL}/api/notifications`);
    },

    /**
     * Get unread notifications count
     */
    async getUnreadNotificationCount() {
        return request(`${API_BASE_URL}/api/notifications/unread-count`);
    },

    /**
     * Mark a specific notification as read
     */
    async markNotificationAsRead(eventId) {
        return request(`${API_BASE_URL}/api/notifications/${eventId}/read`, {
            method: "POST"
        });
    },

    // --- Authentication & User Management APIs ---

    async login(username, password) {
        return request(`${API_BASE_URL}/api/auth/login`, {
            method: "POST",
            body: JSON.stringify({ username, password })
        });
    },

    async logout() {
        return request(`${API_BASE_URL}/api/auth/logout`, {
            method: "POST"
        });
    },

    async getMe() {
        return request(`${API_BASE_URL}/api/auth/me`);
    },

    async changePassword(oldPassword, newPassword) {
        return request(`${API_BASE_URL}/api/auth/change-password`, {
            method: "POST",
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
        });
    },

    async getUsers() {
        return request(`${API_BASE_URL}/api/users`);
    },

    async createUser(username, password, fullName, role) {
        return request(`${API_BASE_URL}/api/users`, {
            method: "POST",
            body: JSON.stringify({ username, password, full_name: fullName, role })
        });
    },

    async updateUser(userId, fullName, role, password = null, isActive = true) {
        return request(`${API_BASE_URL}/api/users/${userId}`, {
            method: "PUT",
            body: JSON.stringify({ full_name: fullName, role, password, is_active: isActive })
        });
    },

    async deleteUser(userId) {
        return request(`${API_BASE_URL}/api/users/${userId}`, {
            method: "DELETE"
        });
    },

    async getAuditLogs(limit = 100) {
        return request(`${API_BASE_URL}/api/v1/safety/audit-logs?limit=${limit}`);
    }
};
