/* pages/Settings.jsx */
import React, { useState } from 'react';
import { api } from '../services/api';
import { useSystem } from '../store/SystemContext';

export const Settings = () => {
    const { fetchEvents } = useSystem();

    // IoT Sensor simulation states
    const [smokeValue, setSmokeValue] = useState(12);
    const [flameValue, setFlameValue] = useState(8);
    const [smokeDetected, setSmokeDetected] = useState(false);
    const [flameDetected, setFlameDetected] = useState(false);
    const [sensorNode, setSensorNode] = useState("Node-01");
    const [isUpdatingSensors, setIsUpdatingSensors] = useState(false);

    // AI simulation states
    const [aiFire, setAiFire] = useState(false);
    const [aiSmoke, setAiSmoke] = useState(false);
    const [aiHuman, setAiHuman] = useState(false);
    const [aiConfidence, setAiConfidence] = useState(0.85);
    const [isTriggeringAI, setIsTriggeringAI] = useState(false);

    const handleUpdateSensors = async (e) => {
        e.preventDefault();
        setIsUpdatingSensors(true);
        try {
            await api.updateSensors({
                smokeDetected,
                flameDetected,
                smokeValue,
                flameValue,
                node: sensorNode
            });
            alert("IoT Sensor status synchronized with FastAPI backend!");
            fetchEvents();
        } catch (err) {
            console.error("Failed to update sensors:", err);
            alert("Lỗi kết nối tới backend.");
        } finally {
            setIsUpdatingSensors(false);
        }
    };

    const handleTriggerAIDetect = async (e) => {
        e.preventDefault();
        setIsTriggeringAI(true);
        try {
            const res = await api.triggerAIDetect({
                fire: aiFire,
                smoke: aiSmoke,
                human: aiHuman,
                confidence: parseFloat(aiConfidence)
            });
            alert(`AI Analysis trigger: ${res.risk_level} state registered.`);
            fetchEvents();
        } catch (err) {
            console.error("Failed to trigger AI alert:", err);
            alert("Lỗi kết nối tới backend.");
        } finally {
            setIsTriggeringAI(false);
        }
    };

    const handleResetAll = async () => {
        setIsUpdatingSensors(true);
        setIsTriggeringAI(true);
        try {
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
            // Reset local states
            setSmokeValue(12);
            setFlameValue(5);
            setSmokeDetected(false);
            setFlameDetected(false);
            setAiFire(false);
            setAiSmoke(false);
            setAiHuman(false);
            setAiConfidence(0.0);
            alert("All simulated inputs set back to SAFE states.");
            fetchEvents();
        } catch (err) {
            console.error("Reset failed:", err);
        } finally {
            setIsUpdatingSensors(false);
            setIsTriggeringAI(false);
        }
    };

    return (
        <div className="settings-workspace">
            {/* IoT Sensor Controller */}
            <div className="settings-card">
                <h3 className="face-db-title">IoT HARDWARE NODE EMULATOR</h3>
                <form onSubmit={handleUpdateSensors}>
                    <div className="input-group">
                        <label htmlFor="sensor-node-id">SENSOR NODE ID</label>
                        <input
                            type="text"
                            id="sensor-node-id"
                            value={sensorNode}
                            onChange={(e) => setSensorNode(e.target.value)}
                        />
                    </div>

                    <div className="setting-slider-item">
                        <div className="setting-slider-header">
                            <span>SMOKE LEVEL</span>
                            <span className="val">{smokeValue} ppm</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="800"
                            value={smokeValue}
                            onChange={(e) => setSmokeValue(parseInt(e.target.value))}
                        />
                    </div>

                    <div className="setting-slider-item">
                        <div className="setting-slider-header">
                            <span>FLAME SPECTRUM LEVEL</span>
                            <span className="val">{flameValue}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={flameValue}
                            onChange={(e) => setFlameValue(parseInt(e.target.value))}
                        />
                    </div>

                    <div className="setting-toggle-item">
                        <div className="setting-toggle-info">
                            <span className="setting-toggle-label">SMOKE THRESHOLD ALARM</span>
                            <span className="setting-toggle-desc">Trigger alarm based on particle density</span>
                        </div>
                        <label className="switch-container">
                            <input
                                type="checkbox"
                                checked={smokeDetected}
                                onChange={(e) => setSmokeDetected(e.target.checked)}
                            />
                            <span className="switch-slider"></span>
                        </label>
                    </div>

                    <div className="setting-toggle-item">
                        <div className="setting-toggle-info">
                            <span className="setting-toggle-label">FLAME SPECTRUM ALARM</span>
                            <span className="setting-toggle-desc">Trigger alarm based on IR wavelengths</span>
                        </div>
                        <label className="switch-container">
                            <input
                                type="checkbox"
                                checked={flameDetected}
                                onChange={(e) => setFlameDetected(e.target.checked)}
                            />
                            <span className="switch-slider"></span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="btn-tech-action primary"
                        disabled={isUpdatingSensors}
                        style={{ width: '100%', marginTop: '20px' }}
                    >
                        {isUpdatingSensors ? "TRANSMITTING TELEMETRY..." : "UPDATE HARDWARE STATE"}
                    </button>
                </form>
            </div>

            {/* AI Vision Analytic Controller */}
            <div className="settings-card">
                <h3 className="face-db-title">YOLOv8 AI CORE INJECTOR</h3>
                <form onSubmit={handleTriggerAIDetect}>
                    <div className="setting-toggle-item">
                        <div className="setting-toggle-info">
                            <span className="setting-toggle-label">TARGET FIRE DETECTION</span>
                            <span className="setting-toggle-desc">Overlay fire bounding box on feed</span>
                        </div>
                        <label className="switch-container">
                            <input
                                type="checkbox"
                                checked={aiFire}
                                onChange={(e) => setAiFire(e.target.checked)}
                            />
                            <span className="switch-slider"></span>
                        </label>
                    </div>

                    <div className="setting-toggle-item">
                        <div className="setting-toggle-info">
                            <span className="setting-toggle-label">TARGET SMOKE CLOUD DETECT</span>
                            <span className="setting-toggle-desc">Overlay smoke bounding box on feed</span>
                        </div>
                        <label className="switch-container">
                            <input
                                type="checkbox"
                                checked={aiSmoke}
                                onChange={(e) => setAiSmoke(e.target.checked)}
                            />
                            <span className="switch-slider"></span>
                        </label>
                    </div>

                    <div className="setting-toggle-item">
                        <div className="setting-toggle-info">
                            <span className="setting-toggle-label">HUMAN DETECTED IN ZONE</span>
                            <span className="setting-toggle-desc">Escalate severity if life safety is compromised</span>
                        </div>
                        <label className="switch-container">
                            <input
                                type="checkbox"
                                checked={aiHuman}
                                onChange={(e) => setAiHuman(e.target.checked)}
                            />
                            <span className="switch-slider"></span>
                        </label>
                    </div>

                    <div className="setting-slider-item" style={{ marginTop: '16px' }}>
                        <div className="setting-slider-header">
                            <span>ANALYSIS CONFIDENCE SCORE</span>
                            <span className="val">{(aiConfidence * 100).toFixed(0)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={aiConfidence * 100}
                            onChange={(e) => setAiConfidence(parseFloat(e.target.value) / 100)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-tech-action primary"
                        disabled={isTriggeringAI}
                        style={{ width: '100%', marginTop: '34px' }}
                    >
                        {isTriggeringAI ? "INJECTING ANALYSIS..." : "TRIGGER AI ALARM STATE"}
                    </button>
                </form>

                <button
                    className="btn-tech-action"
                    onClick={handleResetAll}
                    style={{ width: '100%', marginTop: '12px', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                >
                    RESET SECURITY SHIELD (SAFE STATE)
                </button>
            </div>
        </div>
    );
};
