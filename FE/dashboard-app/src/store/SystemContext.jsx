/* store/SystemContext.jsx */
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const SystemContext = createContext(null);

export const SystemProvider = ({ children }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isBackendConnected, setIsBackendConnected] = useState(false);
    
    // Status states
    const [isCameraOnline, setIsCameraOnline] = useState(false);
    const [npuLoad, setNpuLoad] = useState(0);
    const [systemTemp, setSystemTemp] = useState(42.5);
    const [sprinklerState, setSprinklerState] = useState("OFF");
    const [overallAlertLevel, setOverallAlertLevel] = useState("safe"); // safe, warning, danger
    
    // Sensor states
    const [smokeValue, setSmokeValue] = useState(12);
    const [flameValue, setFlameValue] = useState(8);
    const [smokeDetected, setSmokeDetected] = useState(false);
    const [flameDetected, setFlameDetected] = useState(false);
    const [sensorNode, setSensorNode] = useState("Node-01");
    
    // AI states
    const [aiFireDetected, setAiFireDetected] = useState(false);
    const [aiSmokeDetected, setAiSmokeDetected] = useState(false);
    const [aiConfidence, setAiConfidence] = useState(0.0);
    const [aiBbox, setAiBbox] = useState(null);
    
    // Event Logs / Alerts
    const [events, setEvents] = useState([]);
    
    // Auto Scan PTZ state
    const [autoScanActive, setAutoScanActive] = useState(false);

    // Notifications state
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Face watcher state
    const [faceWatchActive, setFaceWatchActive] = useState(false);

    // MQTT connection state
    const [mqttConnected, setMqttConnected] = useState(false);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        try {
            const res = await api.getNotifications();
            if (res && res.success) {
                setNotifications(res.data);
            }
            const countRes = await api.getUnreadNotificationCount();
            if (countRes && countRes.success) {
                setUnreadCount(countRes.unread);
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
    }, []);

    // Mark notification as read
    const markAsRead = useCallback(async (eventId) => {
        try {
            const res = await api.markNotificationAsRead(eventId);
            if (res && res.success) {
                fetchNotifications();
            }
        } catch (err) {
            console.error(`Failed to mark notification ${eventId} as read:`, err);
        }
    }, [fetchNotifications]);

    // Face watcher actions
    const toggleFaceWatch = useCallback(async () => {
        try {
            if (faceWatchActive) {
                const res = await api.stopFaceWatch();
                if (res && res.success) {
                    setFaceWatchActive(false);
                }
            } else {
                const res = await api.startFaceWatch();
                if (res && res.success) {
                    setFaceWatchActive(true);
                }
            }
        } catch (err) {
            console.error("Failed to toggle face watch worker:", err);
        }
    }, [faceWatchActive]);

    const checkFaceWatchStatus = useCallback(async () => {
        try {
            const res = await api.getFaceWatchStatus();
            if (res && 'running' in res) {
                setFaceWatchActive(res.running);
            }
        } catch (err) {
            console.error("Failed to get face watch status:", err);
        }
    }, []);

    const fetchMQTTStatus = useCallback(async () => {
        try {
            const res = await api.getMQTTStatus();
            if (res && 'connected' in res) {
                setMqttConnected(res.connected);
            }
        } catch (err) {
            console.error("Failed to get MQTT status:", err);
        }
    }, []);

    // Fetch Events list from SQLite
    const fetchEvents = useCallback(async () => {
        try {
            const response = await api.getEvents(10);
            if (response && response.status === "success") {
                setEvents(response.data);
            }
        } catch (err) {
            console.error("Failed to fetch events from backend:", err);
        }
    }, []);

    // Toggle Sprinkler ON/OFF
    const toggleSprinkler = useCallback(async () => {
        const nextAction = sprinklerState === "ON" ? "OFF" : "ON";
        try {
            await api.controlSprinkler(nextAction);
            setSprinklerState(nextAction);
            fetchEvents();
        } catch (err) {
            console.error("Failed to control sprinkler:", err);
            // Simulated toggle fallback if offline
            if (!isBackendConnected) {
                setSprinklerState(nextAction);
            }
        }
    }, [sprinklerState, isBackendConnected, fetchEvents]);

    // Emergency Stop: Turn off pump & clear simulated sensor alerts
    const triggerEmergencyStop = useCallback(async () => {
        try {
            await api.controlSprinkler("OFF");
            setSprinklerState("OFF");
            
            // If backend connected, reset sensors and AI to safe
            if (isBackendConnected) {
                await api.updateSensors({
                    smokeDetected: false,
                    flameDetected: false,
                    smokeValue: 12,
                    flameValue: 5,
                    node: sensorNode
                });
                await api.triggerAIDetect({
                    fire: false,
                    smoke: false,
                    human: false,
                    confidence: 0.0
                });
            }
            fetchEvents();
        } catch (err) {
            console.error("Emergency stop failed:", err);
            setSprinklerState("OFF");
        }
    }, [isBackendConnected, sensorNode, fetchEvents]);

    // API Polling Loop
    useEffect(() => {
        let isMounted = true;
        let localNpuLoad = 0;
        let localTemp = 42.5;
        
        const pollAPIs = async () => {
            try {
                // Single poll status endpoint
                const status = await api.getSystemStatus();
                if (!isMounted) return;

                setIsBackendConnected(true);
                setIsCameraOnline(status.camera?.online || false);
                setSprinklerState(status.sprinkler?.status || "OFF");
                setOverallAlertLevel(status.overallAlertLevel || "safe");
                
                // Set IoT sensors
                setSmokeValue(status.sensor?.smokeValue || 0);
                setFlameValue(status.sensor?.flameValue || 0);
                setSmokeDetected(status.sensor?.smokeDetected || false);
                setFlameDetected(status.sensor?.flameDetected || false);
                setSensorNode(status.sensor?.node || "Node-01");
                
                // Set AI Detection states
                setAiFireDetected(status.ai?.fireDetected || false);
                setAiSmokeDetected(status.ai?.smokeDetected || false);
                setAiConfidence(status.ai?.confidence || 0.0);
                setAiBbox(status.ai?.bbox || null);

                // NPU details (Simulate fluctuations on standby/load)
                const isUnderLoad = status.overallAlertLevel !== "safe";
                const targetLoad = isUnderLoad ? 82 : 24;
                const targetTemp = isUnderLoad ? 58.6 : 41.2;
                
                localNpuLoad += (targetLoad - localNpuLoad) * 0.2;
                localTemp += (targetTemp - localTemp) * 0.1;
                
                setNpuLoad(localNpuLoad + (Math.random() - 0.5) * 2);
                setSystemTemp(localTemp + (Math.random() - 0.5) * 0.3);

                // Fetch real-time statuses
                fetchNotifications();
                checkFaceWatchStatus();
                fetchMQTTStatus();

            } catch (err) {
                // Offline Simulated Mode Fallback
                if (!isMounted) return;
                setIsBackendConnected(false);
                setIsCameraOnline(true); // Simulate Dahua as online for rendering
                setMqttConnected(false);
                setFaceWatchActive(false);
                setUnreadCount(0);
                setAiBbox(null);
                
                // Fluctuating Simulated Telemetry
                setNpuLoad(prev => {
                    const base = overallAlertLevel !== "safe" ? 78 : 18;
                    const val = prev + (base - prev) * 0.2 + (Math.random() - 0.5) * 1.5;
                    return Math.max(5, Math.min(100, val));
                });
                
                setSystemTemp(prev => {
                    const base = overallAlertLevel !== "safe" ? 56 : 42;
                    const val = prev + (base - prev) * 0.1 + (Math.random() - 0.5) * 0.2;
                    return Math.max(30, Math.min(85, val));
                });

                // Simulate slow status changes if not triggered manually
                // We keep current simulated values otherwise
            }
        };

        pollAPIs();
        const interval = setInterval(pollAPIs, 1500);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [overallAlertLevel, fetchNotifications, checkFaceWatchStatus, fetchMQTTStatus]);

    // Poll Event logs periodically
    useEffect(() => {
        fetchEvents();
        const interval = setInterval(fetchEvents, 3000);
        return () => clearInterval(interval);
    }, [fetchEvents]);

    // Simulated scanning behavior
    useEffect(() => {
        if (!autoScanActive) return;
        
        let direction = 1;
        const scanSequence = async () => {
            if (isBackendConnected && isCameraOnline) {
                try {
                    const action = direction > 0 ? "right" : "left";
                    await api.sendPTZCommand(action);
                    setTimeout(() => api.sendPTZCommand("stop", { code: action }), 300);
                } catch (err) {
                    console.error("PTZ AutoScan command failed:", err);
                }
            }
            direction = -direction;
        };

        const interval = setInterval(scanSequence, 4000);
        return () => clearInterval(interval);
    }, [autoScanActive, isBackendConnected, isCameraOnline]);

    return (
        <SystemContext.Provider value={{
            activeTab,
            setActiveTab,
            isBackendConnected,
            isCameraOnline,
            npuLoad,
            systemTemp,
            sprinklerState,
            overallAlertLevel,
            smokeValue,
            flameValue,
            smokeDetected,
            flameDetected,
            sensorNode,
            aiFireDetected,
            aiSmokeDetected,
            aiConfidence,
            aiBbox,
            events,
            fetchEvents,
            toggleSprinkler,
            triggerEmergencyStop,
            autoScanActive,
            setAutoScanActive,
            notifications,
            unreadCount,
            fetchNotifications,
            markAsRead,
            faceWatchActive,
            toggleFaceWatch,
            mqttConnected,
            fetchMQTTStatus
        }}>
            {children}
        </SystemContext.Provider>
    );
};

export const useSystem = () => {
    const context = useContext(SystemContext);
    if (!context) {
        throw new Error("useSystem must be used within a SystemProvider");
    }
    return context;
};
