/* store/SystemContext.jsx */
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const SystemContext = createContext(null);

export const SystemProvider = ({ children }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [activeCameraId, setActiveCameraId] = useState(1);
    const [is2x2Layout, setIs2x2Layout] = useState(true);
    
    // Status states
    const [isCameraOnline, setIsCameraOnline] = useState(false);
    const [npuLoad, setNpuLoad] = useState(0);
    const [systemTemp, setSystemTemp] = useState(42.5);
    
    // Sensor states
    const [smokeValue, setSmokeValue] = useState(12);
    const [flameValue, setFlameValue] = useState(8);
    const [smokeDetected, setSmokeDetected] = useState(false);
    const [flameDetected, setFlameDetected] = useState(false);
    
    // Alerts State
    const [alerts, setAlerts] = useState([
        { id: 4, time: "18:08:15", desc: "Motion detected at Back Door", level: "high" },
        { id: 3, time: "18:08:50", desc: "Parking Lot Camera 2 - Online", level: "info" },
        { id: 2, time: "17:59:30", desc: "Object identified at Front Gate", level: "med" },
        { id: 1, time: "17:45:01", desc: "System Update Completed", level: "info" }
    ]);

    const addAlert = useCallback((desc, level = 'info') => {
        const now = new Date();
        const pad = (num) => String(num).padStart(2, '0');
        const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        
        setAlerts(prev => [
            {
                id: Date.now(),
                time: timeStr,
                desc,
                level,
                isNew: true
            },
            ...prev
        ].slice(0, 8)); // Limit to last 8 alerts
    }, []);

    // API Polling Loop
    useEffect(() => {
        let isMounted = true;
        
        const pollAPIs = async () => {
            // Poll Camera Status
            try {
                const status = await api.getCameraStatus();
                if (isMounted) {
                    setIsCameraOnline(status.cameraOnline);
                }
            } catch (err) {
                if (isMounted) setIsCameraOnline(false);
            }

            // Poll AI/NPU status
            try {
                const aiStatus = await api.getAIStatus();
                if (isMounted) {
                    setNpuLoad(parseFloat(aiStatus.npu_load || 0));
                    setSystemTemp(parseFloat(aiStatus.npu_temp || 42.5));
                }
            } catch (err) {
                if (isMounted) {
                    // Simulated walk
                    setNpuLoad(Math.floor(Math.random() * 20) + 15);
                    setSystemTemp(prev => {
                        const next = prev + (Math.random() - 0.5) * 0.2;
                        return Math.max(40, Math.min(45, next));
                    });
                }
            }

            // Poll Sensors
            try {
                const sensors = await api.getSensors();
                if (isMounted) {
                    setSmokeValue(sensors.smokeValue || 0);
                    setFlameValue(sensors.flameValue || 0);
                    setSmokeDetected(sensors.smokeDetected || false);
                    setFlameDetected(sensors.flameDetected || false);
                }
            } catch (err) {
                if (isMounted) {
                    setSmokeValue(12);
                    setFlameValue(8);
                    setSmokeDetected(false);
                    setFlameDetected(false);
                }
            }
        };

        pollAPIs();
        const interval = setInterval(pollAPIs, 2500);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    // Alert Queue Simulator
    useEffect(() => {
        const templates = [
            { desc: "Motion detected at Lobby", level: "med" },
            { desc: "AI: Unrecognized vehicle at Front Gate", level: "high" },
            { desc: "Back Door sensor alert: Door opened", level: "high" },
            { desc: "Thermal Scanner: Normal state threshold", level: "info" }
        ];

        const alertInterval = setInterval(() => {
            const tmpl = templates[Math.floor(Math.random() * templates.length)];
            addAlert(tmpl.desc, tmpl.level);
        }, 25000);

        return () => clearInterval(alertInterval);
    }, [addAlert]);

    return (
        <SystemContext.Provider value={{
            activeTab,
            setActiveTab,
            activeCameraId,
            setActiveCameraId,
            is2x2Layout,
            setIs2x2Layout,
            isCameraOnline,
            npuLoad,
            systemTemp,
            smokeValue,
            flameValue,
            smokeDetected,
            flameDetected,
            alerts,
            addAlert
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
