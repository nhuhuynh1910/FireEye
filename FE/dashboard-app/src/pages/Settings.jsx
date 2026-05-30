/* pages/Settings.jsx */
import React, { useState } from 'react';
import { api } from '../services/api';
import { useSystem } from '../store/SystemContext';

export const Settings = () => {
    const { fetchEvents, mqttConnected } = useSystem();

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

    // Bounding Box adjuster states
    const [bboxX, setBboxX] = useState(408);
    const [bboxY, setBboxY] = useState(218);
    const [bboxW, setBboxW] = useState(180);
    const [bboxH, setBboxH] = useState(170);

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
            const hasDetect = aiFire || aiSmoke || aiHuman;
            const res = await api.triggerAIDetect({
                fire: aiFire,
                smoke: aiSmoke,
                human: aiHuman,
                confidence: parseFloat(aiConfidence),
                bbox: hasDetect ? [bboxX, bboxY, bboxX + bboxW, bboxY + bboxH] : null
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
                confidence: 0.0,
                bbox: null
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
            setBboxX(408);
            setBboxY(218);
            setBboxW(180);
            setBboxH(170);
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

                    <div style={{ marginTop: '20px', borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-cyan)', letterSpacing: '0.5px' }}>TARGET BOUNDING BOX ADJUSTER (960x540 Frame)</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                            <div className="setting-slider-item" style={{ margin: 0 }}>
                                <div className="setting-slider-header">
                                    <span>LEFT (X)</span>
                                    <span className="val" style={{ fontFamily: 'monospace' }}>{bboxX}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="960"
                                    value={bboxX}
                                    onChange={(e) => setBboxX(parseInt(e.target.value))}
                                />
                            </div>
                            <div className="setting-slider-item" style={{ margin: 0 }}>
                                <div className="setting-slider-header">
                                    <span>TOP (Y)</span>
                                    <span className="val" style={{ fontFamily: 'monospace' }}>{bboxY}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="540"
                                    value={bboxY}
                                    onChange={(e) => setBboxY(parseInt(e.target.value))}
                                />
                            </div>
                            <div className="setting-slider-item" style={{ margin: 0 }}>
                                <div className="setting-slider-header">
                                    <span>WIDTH</span>
                                    <span className="val" style={{ fontFamily: 'monospace' }}>{bboxW}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="20"
                                    max="500"
                                    value={bboxW}
                                    onChange={(e) => setBboxW(parseInt(e.target.value))}
                                />
                            </div>
                            <div className="setting-slider-item" style={{ margin: 0 }}>
                                <div className="setting-slider-header">
                                    <span>HEIGHT</span>
                                    <span className="val" style={{ fontFamily: 'monospace' }}>{bboxH}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="20"
                                    max="500"
                                    value={bboxH}
                                    onChange={(e) => setBboxH(parseInt(e.target.value))}
                                />
                            </div>
                        </div>
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

            {/* MQTT Health state card */}
            <div className="settings-card">
                <h3 className="face-db-title">MQTT BROKER CONNECTION HEALTH</h3>
                <div className="mqtt-health-status-container" style={{ marginTop: '15px' }}>
                    <div className="mqtt-status-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span className="mqtt-status-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Broker Link Status:</span>
                        <span className={`mqtt-status-value-badge ${mqttConnected ? 'online' : 'offline'}`} style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            backgroundColor: mqttConnected ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                            border: `1px solid ${mqttConnected ? 'var(--accent-cyan)' : 'var(--accent-red)'}`,
                            color: mqttConnected ? 'var(--accent-cyan)' : 'var(--accent-red)'
                        }}>
                            {mqttConnected ? 'CONNECTED' : 'DISCONNECTED'}
                        </span>
                    </div>
                    <p className="mqtt-health-desc" style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        The broker listens to sprinkler actions and relays sensor warnings to industrial alarms. 
                        Check backend configuration settings for MQTT daemon server configuration.
                    </p>
                </div>
            </div>
        </div>
    );
};
