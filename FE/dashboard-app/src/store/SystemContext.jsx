/* store/SystemContext.jsx */
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { api, API_BASE_URL, BACKEND_IP } from '../services/api';

const SystemContext = createContext(null);

export const SystemProvider = ({ children }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [viewMode, setViewMode] = useState('operator'); // 'operator' | 'admin'
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
    const [aiHumanDetected, setAiHumanDetected] = useState(false);
    const [aiConfidence, setAiConfidence] = useState(0.0);
    const [aiBbox, setAiBbox] = useState(null);
    const [hailoStatus, setHailoStatus] = useState("standby");
    
    // Event Logs / Alerts
    const [events, setEvents] = useState([]);
    
    // Auto Scan PTZ state
    const [autoScanActive, setAutoScanActive] = useState(false);
    const [activeZoneId, setActiveZoneId] = useState(null);

    // PTZ panel visibility state
    const [isPTZVisible, setIsPTZVisible] = useState(true);

    // Notifications state
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Face watcher state
    const [faceWatchActive, setFaceWatchActive] = useState(false);

    // MQTT connection state
    const [mqttConnected, setMqttConnected] = useState(false);

    // Safety Voting multi-sig session states
    const [activeVote, setActiveVote] = useState(null);
    const safetyWSRef = useRef(null);

    // Zone sensor telemetries state (from ESP32 JSON data)
    const [zones, setZones] = useState({
        1: { temperature: 0.0, humidity: 0.0, gas: 1, pump: "OFF", buzzer: "OFF", mode: "MANUAL" },
        2: { temperature: 0.0, humidity: 0.0, gas: 1, pump: "OFF", buzzer: "OFF", mode: "MANUAL" },
        3: { temperature: 0.0, humidity: 0.0, gas: 1, pump: "OFF", buzzer: "OFF", mode: "MANUAL" },
        4: { temperature: 0.0, humidity: 0.0, gas: 1, pump: "OFF", buzzer: "OFF", mode: "MANUAL" }
    });

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
    const fetchEvents = useCallback(async (limit = 10) => {
        try {
            const response = await api.getEvents(limit);
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

    // Toggle Sprinkler ON/OFF for a specific Zone
    const toggleZoneSprinkler = useCallback(async (zoneId) => {
        const zoneData = zones[zoneId] || { pump: "OFF" };
        const isCurrentlyOn = zoneData.pump === "ON";
        const actionStr = isCurrentlyOn ? "SPRINKLER_OFF" : "SPRINKLER_ON";
        try {
            const res = await api.safetyControl(zoneId, actionStr);
            
            if (res.status === "VOTING_REQUIRED") {
                console.log("Voting required, session created:", res.session_token);
            } else if (res.status === "OWNER_OVERRIDE_EXECUTED" || res.status === "EMERGENCY_EXECUTED") {
                const finalState = isCurrentlyOn ? "OFF" : "ON";
                // Update local state instantly for UI responsiveness
                setZones(prev => ({
                    ...prev,
                    [zoneId]: {
                        ...prev[zoneId],
                        pump: finalState
                    }
                }));
                fetchEvents();
            }
        } catch (err) {
            console.error(`Failed to control sprinkler for zone ${zoneId}:`, err);
        }
    }, [zones, fetchEvents]);

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

    // Submit multi-sig consensus vote choice
    const submitVote = useCallback((choice) => {
        if (safetyWSRef.current && safetyWSRef.current.readyState === WebSocket.OPEN && activeVote) {
            safetyWSRef.current.send(JSON.stringify({
                type: "SUBMIT_VOTE",
                session_token: activeVote.session_token,
                choice: choice
            }));
            console.log(`Submitted vote [${choice}] for session ${activeVote.session_token}`);
        } else {
            console.warn("Safety WebSocket is not open or no active vote session exists.");
        }
    }, [activeVote]);

    // WebSocket real-time AI alerts
    useEffect(() => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/ai`;
        
        let socket;
        let reconnectTimeout;
        let isClosed = false;

        const connectWS = () => {
            if (isClosed) return;
            
            // Clean up any existing socket before creating a new one
            if (socket) {
                socket.onclose = null;
                socket.onerror = null;
                socket.onmessage = null;
                try { socket.close(); } catch (e) { /* ignore */ }
            }

            console.log("Connecting to AI WebSocket:", wsUrl);
            socket = new WebSocket(wsUrl);

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === "ai_detection") {
                        setAiFireDetected(data.fire);
                        setAiSmokeDetected(data.smoke);
                        setAiHumanDetected(data.human);
                        setAiConfidence(data.confidence);
                        setAiBbox(data.bbox);
                        
                        // Update overall alert level instantly
                        const isUnderDanger = data.fire || data.smoke;
                        setOverallAlertLevel(isUnderDanger ? "danger" : (data.human ? "warning" : "safe"));
                    }
                } catch (err) {
                    console.error("Failed to parse AI WebSocket data:", err);
                }
            };

            socket.onclose = () => {
                if (isClosed) return;
                console.log("AI WebSocket disconnected. Reconnecting in 3 seconds...");
                reconnectTimeout = setTimeout(connectWS, 3000);
            };

            socket.onerror = (err) => {
                if (isClosed) return;
                console.error("AI WebSocket error:", err);
                socket.close();
            };
        };

        connectWS();

        return () => {
            isClosed = true;
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (socket) {
                socket.onclose = null;
                socket.onerror = null;
                socket.onmessage = null;
                socket.close();
            }
        };
    }, []);

    // Get safety WebSocket URL
    const getSafetyWSUrl = () => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        // Luôn đi qua cùng host/port với trang web (Vite proxy sẽ chuyển tiếp /api/* về backend)
        const host = window.location.host;
        let url = `${protocol}//${host}/api/v1/safety/ws`;
        const token = localStorage.getItem('access_token');
        if (token) {
            url += `?token=${encodeURIComponent(token)}`;
        }
        return url;
    };

    // WebSocket real-time safety control/voting alerts
    useEffect(() => {
        let reconnectTimeout;
        let isClosed = false;

        const connectSafetyWS = () => {
            if (isClosed) return;

            if (safetyWSRef.current) {
                safetyWSRef.current.onclose = null;
                safetyWSRef.current.onerror = null;
                safetyWSRef.current.onmessage = null;
                try { safetyWSRef.current.close(); } catch (e) { /* ignore */ }
            }

            const wsUrl = getSafetyWSUrl();
            console.log("Connecting to Safety WebSocket:", wsUrl);
            const socket = new WebSocket(wsUrl);
            safetyWSRef.current = socket;

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("Safety WS received:", data);
                    
                    if (data.type === "SYSTEM_STATUS") {
                        if (data.active_sessions && data.active_sessions.length > 0) {
                            const pending = data.active_sessions.find(s => s.status === "PENDING");
                            if (pending) {
                                setActiveVote(pending);
                            }
                        }
                    } else if (data.type === "VOTE_REQUEST") {
                        setActiveVote(data);
                    } else if (data.type === "VOTE_COUNT_UPDATE") {
                        setActiveVote(prev => {
                            if (prev && prev.session_token === data.session_token) {
                                return {
                                    ...prev,
                                    votes_approve: data.votes_approve,
                                    votes_reject: data.votes_reject
                                };
                            }
                            return prev;
                        });
                    } else if (data.type === "VOTING_FINISHED") {
                        setActiveVote(null);
                        fetchEvents();
                    }
                } catch (err) {
                    console.error("Failed to parse Safety WebSocket data:", err);
                }
            };

            socket.onclose = () => {
                if (isClosed) return;
                console.log("Safety WebSocket disconnected. Reconnecting in 3 seconds...");
                reconnectTimeout = setTimeout(connectSafetyWS, 3000);
            };

            socket.onerror = (err) => {
                if (isClosed) return;
                console.error("Safety WebSocket error:", err);
                socket.close();
            };
        };

        connectSafetyWS();

        return () => {
            isClosed = true;
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (safetyWSRef.current) {
                safetyWSRef.current.onclose = null;
                safetyWSRef.current.onerror = null;
                safetyWSRef.current.onmessage = null;
                safetyWSRef.current.close();
            }
        };
    }, [fetchEvents]);

    // Web Audio API Synthesizer Alert
    useEffect(() => {
        let osc1, osc2, gainNode, audioCtx;
        let intervalId;

        if (overallAlertLevel === "safe") {
            return;
        }

        const startSynthesizer = () => {
            try {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                audioCtx = new AudioContextClass();
                gainNode = audioCtx.createGain();
                gainNode.connect(audioCtx.destination);
                gainNode.gain.setValueAtTime(0.0, audioCtx.currentTime);

                if (overallAlertLevel === "danger") {
                    // Warbling fire siren
                    osc1 = audioCtx.createOscillator();
                    osc2 = audioCtx.createOscillator();

                    osc1.type = "sawtooth";
                    osc2.type = "sine";

                    osc1.frequency.setValueAtTime(880, audioCtx.currentTime); 
                    osc2.frequency.setValueAtTime(2.0, audioCtx.currentTime); // 2Hz LFO
                    
                    const lfoGain = audioCtx.createGain();
                    lfoGain.gain.setValueAtTime(150, audioCtx.currentTime);

                    osc2.connect(lfoGain);
                    lfoGain.connect(osc1.frequency);
                    osc1.connect(gainNode);

                    osc1.start();
                    osc2.start();

                    gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
                    
                    let toggle = true;
                    intervalId = setInterval(() => {
                        if (!audioCtx || audioCtx.state === "closed") return;
                        if (toggle) {
                            gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.2);
                        } else {
                            gainNode.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.2);
                        }
                        toggle = !toggle;
                    }, 500);

                } else if (overallAlertLevel === "warning") {
                    // Warning beeps
                    osc1 = audioCtx.createOscillator();
                    osc1.type = "sine";
                    osc1.frequency.setValueAtTime(1200, audioCtx.currentTime);
                    osc1.connect(gainNode);
                    osc1.start();

                    intervalId = setInterval(() => {
                        if (!audioCtx || audioCtx.state === "closed") return;
                        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
                        gainNode.gain.setValueAtTime(0.0, audioCtx.currentTime + 0.15);
                    }, 1000);
                }
            } catch (err) {
                console.warn("Failed to start Web Audio synthesizer (requires page interaction):", err);
            }
        };

        startSynthesizer();

        return () => {
            if (intervalId) clearInterval(intervalId);
            if (osc1) { try { osc1.stop(); } catch(e){} }
            if (osc2) { try { osc2.stop(); } catch(e){} }
            if (audioCtx) { try { audioCtx.close(); } catch(e){} }
        };
    }, [overallAlertLevel]);

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
                if (status.zones) {
                    setZones(status.zones);
                }
                
                // Set IoT sensors
                setSmokeValue(status.sensor?.smokeValue || 0);
                setFlameValue(status.sensor?.flameValue || 0);
                setSmokeDetected(status.sensor?.smokeDetected || false);
                setFlameDetected(status.sensor?.flameDetected || false);
                setSensorNode(status.sensor?.node || "Node-01");
                
                // Set AI Detection states
                setAiFireDetected(status.ai?.fireDetected || false);
                setAiSmokeDetected(status.ai?.smokeDetected || false);
                setAiHumanDetected(status.ai?.humanDetected || false);
                setAiConfidence(status.ai?.confidence || 0.0);
                setAiBbox(status.ai?.bbox || null);
                setHailoStatus(status.aiAccelerator?.status || "standby");

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
                setAiHumanDetected(false);
                setHailoStatus("offline");
                
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
        const interval = setInterval(pollAPIs, 2000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [overallAlertLevel, fetchNotifications, checkFaceWatchStatus, fetchMQTTStatus]);

    // Poll Event logs periodically
    useEffect(() => {
        const limit = activeTab === 'events' ? 100 : 10;
        fetchEvents(limit);
        const interval = setInterval(() => fetchEvents(limit), activeTab === 'events' ? 2500 : 3000);
        return () => clearInterval(interval);
    }, [fetchEvents, activeTab]);

    // Enhanced scanning behavior based on preset zones
    useEffect(() => {
        if (!autoScanActive) return;
        
        const scanZones = [1, 2, 3, 4];
        let currentZoneIndex = 0;
        
        const scanSequence = async () => {
            if (isBackendConnected && isCameraOnline) {
                try {
                    const zoneId = scanZones[currentZoneIndex];
                    setActiveZoneId(zoneId);
                    await api.moveToZone(zoneId);
                    currentZoneIndex = (currentZoneIndex + 1) % scanZones.length;
                } catch (err) {
                    console.error("PTZ AutoScan zone transition failed:", err);
                }
            }
        };

        // Run immediately on start, then repeat every 15 seconds
        scanSequence();
        const interval = setInterval(scanSequence, 15000);
        
        return () => {
            clearInterval(interval);
            // Return to home position when scanning stops
            if (isBackendConnected && isCameraOnline) {
                setActiveZoneId(null);
                api.goHome().catch(err => console.error("Failed to return camera to home on disable:", err));
            }
        };
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
            aiHumanDetected,
            aiConfidence,
            aiBbox,
            hailoStatus,
            events,
            fetchEvents,
            toggleSprinkler,
            toggleZoneSprinkler,
            triggerEmergencyStop,
            autoScanActive,
            setAutoScanActive,
            activeZoneId,
            setActiveZoneId,
            isPTZVisible,
            setIsPTZVisible,
            notifications,
            unreadCount,
            fetchNotifications,
            markAsRead,
            faceWatchActive,
            toggleFaceWatch,
            mqttConnected,
            fetchMQTTStatus,
            zones,
            viewMode,
            setViewMode,
            activeVote,
            submitVote
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
