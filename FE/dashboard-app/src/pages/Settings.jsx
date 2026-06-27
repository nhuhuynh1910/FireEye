/* pages/Settings.jsx */
import React, { useState } from 'react';
import { api } from '../services/api';
import { useSystem } from '../store/SystemContext';

export const Settings = () => {
    const { 
        fetchEvents, 
        mqttConnected, 
        faceWatchActive, 
        toggleFaceWatch,
        isCameraOnline,
        isBackendConnected,
        setAutoScanActive,
        setActiveZoneId
    } = useSystem();

    // IoT Sensor simulation states
    const [smokeValue, setSmokeValue] = useState(12);
    const [flameValue, setFlameValue] = useState(8);
    const [smokeDetected, setSmokeDetected] = useState(false);
    const [flameDetected, setFlameDetected] = useState(false);
    const [sensorNode, setSensorNode] = useState("Node-01");
    const [isUpdatingSensors, setIsUpdatingSensors] = useState(false);

    const [isTriggeringAI, setIsTriggeringAI] = useState(false);

    // Configured states mapped per Zone (1 to 5)
    const [zoneConfigs, setZoneConfigs] = useState({
        1: { fire: false, smoke: false, human: false, confidence: 0.85, bboxX: 220, bboxY: 180, bboxW: 280, bboxH: 220 },
        2: { fire: false, smoke: false, human: false, confidence: 0.85, bboxX: 408, bboxY: 218, bboxW: 180, bboxH: 170 },
        3: { fire: false, smoke: false, human: false, confidence: 0.85, bboxX: 420, bboxY: 80, bboxW: 350, bboxH: 190 },
        4: { fire: false, smoke: false, human: false, confidence: 0.85, bboxX: 620, bboxY: 280, bboxW: 110, bboxH: 210 },
        5: { fire: false, smoke: false, human: false, confidence: 0.85, bboxX: 408, bboxY: 218, bboxW: 180, bboxH: 170 }
    });
    // Simulation target physical zone
    const [targetZoneId, setTargetZoneId] = useState(1);

    // Helper to get active properties
    const activeConf = zoneConfigs[targetZoneId] || { fire: false, smoke: false, human: false, confidence: 0.85, bboxX: 408, bboxY: 218, bboxW: 180, bboxH: 170 };
    const aiFire = activeConf.fire;
    const aiSmoke = activeConf.smoke;
    const aiHuman = activeConf.human;
    const aiConfidence = activeConf.confidence;
    const bboxX = activeConf.bboxX;
    const bboxY = activeConf.bboxY;
    const bboxW = activeConf.bboxW;
    const bboxH = activeConf.bboxH;

    const updateActiveConfig = (field, value) => {
        setZoneConfigs(prev => ({
            ...prev,
            [targetZoneId]: {
                ...prev[targetZoneId],
                [field]: value
            }
        }));
    };

    // Interactive canvas drawing states
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });

    const handleCanvasMouseDown = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        
        // Convert screen coordinates to 960x540 coordinates
        const xVal = Math.round((clientX / rect.width) * 960);
        const yVal = Math.round((clientY / rect.height) * 540);

        setDrawStart({ x: xVal, y: yVal });
        setZoneConfigs(prev => ({
            ...prev,
            [targetZoneId]: {
                ...prev[targetZoneId],
                bboxX: xVal,
                bboxY: yVal,
                bboxW: 10,
                bboxH: 10
            }
        }));
        setIsDrawing(true);
    };

    const handleCanvasMouseMove = (e) => {
        if (!isDrawing) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        const xVal = Math.round((clientX / rect.width) * 960);
        const yVal = Math.round((clientY / rect.height) * 540);

        // Calculate box dimensions
        const xMin = Math.max(0, Math.min(drawStart.x, xVal));
        const yMin = Math.max(0, Math.min(drawStart.y, yVal));
        const width = Math.min(960 - xMin, Math.abs(xVal - drawStart.x));
        const height = Math.min(540 - yMin, Math.abs(yVal - drawStart.y));

        setZoneConfigs(prev => ({
            ...prev,
            [targetZoneId]: {
                ...prev[targetZoneId],
                bboxX: xMin,
                bboxY: yMin,
                bboxW: Math.max(10, width),
                bboxH: Math.max(10, height)
            }
        }));
    };

    const handleCanvasMouseUp = () => {
        setIsDrawing(false);
    };

    const applyScenario = (type) => {
        let zone = 1;
        let config = { fire: false, smoke: false, human: false, confidence: 0.85, bboxX: 408, bboxY: 218, bboxW: 180, bboxH: 170 };
        switch (type) {
            case 'fire':
                zone = 1;
                config = { fire: true, smoke: true, human: false, confidence: 0.95, bboxX: 220, bboxY: 180, bboxW: 280, bboxH: 220 };
                break;
            case 'smoke':
                zone = 3;
                config = { fire: false, smoke: true, human: false, confidence: 0.82, bboxX: 420, bboxY: 80, bboxW: 350, bboxH: 190 };
                break;
            case 'human':
                zone = 4;
                config = { fire: false, smoke: false, human: true, confidence: 0.89, bboxX: 620, bboxY: 280, bboxW: 110, bboxH: 210 };
                break;
            default:
                break;
        }
        setTargetZoneId(zone);
        setZoneConfigs(prev => ({
            ...prev,
            [zone]: config
        }));
    };

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
            alert("Backend connection error.");
        } finally {
            setIsUpdatingSensors(false);
        }
    };

    const handleTriggerAIDetect = async (e) => {
        e.preventDefault();
        setIsTriggeringAI(true);
        try {
            // Auto-align camera to target zone before triggering
            if (isCameraOnline && isBackendConnected && targetZoneId) {
                setAutoScanActive(false); // Stop auto-scanning
                if (targetZoneId === 5) {
                    setActiveZoneId(null); // Home has no active zone focus ID
                    await api.goHome();
                } else {
                    setActiveZoneId(targetZoneId); // Select current active zone focus
                    await api.moveToZone(targetZoneId);
                }
                // Delay 1.5s to let PTZ camera finish mechanical rotation
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            const hasDetect = aiFire || aiSmoke || aiHuman;
            const res = await api.triggerAIDetect({
                fire: aiFire,
                smoke: aiSmoke,
                human: aiHuman,
                confidence: parseFloat(aiConfidence),
                bbox: hasDetect ? [bboxX, bboxY, bboxX + bboxW, bboxY + bboxH] : null
            });
            const zoneName = targetZoneId === 5 ? "Preset 05 (Default Home)" : `Zone 0${targetZoneId}`;
            alert(`AI Analysis trigger: ${res.risk_level} state registered in ${zoneName}.`);
            fetchEvents();
        } catch (err) {
            console.error("Failed to trigger AI alert:", err);
            alert("Backend connection error.");
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
            setZoneConfigs({
                1: { fire: false, smoke: false, human: false, confidence: 0.85, bboxX: 220, bboxY: 180, bboxW: 280, bboxH: 220 },
                2: { fire: false, smoke: false, human: false, confidence: 0.85, bboxX: 408, bboxY: 218, bboxW: 180, bboxH: 170 },
                3: { fire: false, smoke: false, human: false, confidence: 0.85, bboxX: 420, bboxY: 80, bboxW: 350, bboxH: 190 },
                4: { fire: false, smoke: false, human: false, confidence: 0.85, bboxX: 620, bboxY: 280, bboxW: 110, bboxH: 210 },
                5: { fire: false, smoke: false, human: false, confidence: 0.85, bboxX: 408, bboxY: 218, bboxW: 180, bboxH: 170 }
            });
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
                
                {/* Scenario Presets Quick Trigger */}
                <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>SCENARIO SIMULATION PRESETS</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            type="button" 
                            className="btn-tech-action" 
                            style={{ fontSize: '10px', padding: '6px 8px', flex: 1, marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} 
                            onClick={() => applyScenario('fire')}
                        >
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                            </svg>
                            Fire Preset
                        </button>
                        <button 
                            type="button" 
                            className="btn-tech-action" 
                            style={{ fontSize: '10px', padding: '6px 8px', flex: 1, marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} 
                            onClick={() => applyScenario('smoke')}
                        >
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-3-5.5-3-5.5s-3 2.71-3 5.5a3.5 3.5 0 0 0 3.5 3.5z"/>
                                <path d="M6.5 19A3.5 3.5 0 0 0 10 15.5c0-2.79-3-5.5-3-5.5s-3 2.71-3 5.5a3.5 3.5 0 0 0 3.5 3.5z"/>
                            </svg>
                            Smoke Preset
                        </button>
                        <button 
                            type="button" 
                            className="btn-tech-action" 
                            style={{ fontSize: '10px', padding: '6px 8px', flex: 1, marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} 
                            onClick={() => applyScenario('human')}
                        >
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            Human Preset
                        </button>
                    </div>
                </div>

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
                                onChange={(e) => updateActiveConfig('fire', e.target.checked)}
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
                                onChange={(e) => updateActiveConfig('smoke', e.target.checked)}
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
                                onChange={(e) => updateActiveConfig('human', e.target.checked)}
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
                            onChange={(e) => updateActiveConfig('confidence', parseFloat(e.target.value) / 100)}
                        />
                    </div>

                    <div className="input-group" style={{ marginTop: '16px' }}>
                        <label htmlFor="target-zone-select">TARGET PHYSICAL ZONE FOR ALIGNMENT</label>
                        <select
                            id="target-zone-select"
                            value={targetZoneId}
                            onChange={(e) => setTargetZoneId(parseInt(e.target.value))}
                            disabled={isTriggeringAI}
                        >
                            <option value={1}>Zone 01: Warehouse North</option>
                            <option value={2}>Zone 02: Loading Dock</option>
                            <option value={3}>Zone 03: Server Room</option>
                            <option value={4}>Zone 04: Office Suite</option>
                            <option value={5}>Preset 05: Default Home</option>
                        </select>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                            Triggering the alarm will automatically move the PTZ camera to this zone first.
                        </span>
                    </div>

                    <div style={{ marginTop: '20px', borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-cyan)', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                            INTERACTIVE BOUNDING BOX DRAWING (960x540 Frame)
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '12px' }}>
                            Click and drag your cursor directly on the preview feed below to draw the simulated alert region:
                        </span>

                        {/* Interactive Drawing Box Container */}
                        <div className="bbox-interactive-container" style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#020408', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                            <img 
                                src={api.getStreamUrl()} 
                                alt="Camera Stream Preview" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5, pointerEvents: 'none' }} 
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            
                            <div 
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair', zIndex: 10 }}
                                onMouseDown={handleCanvasMouseDown}
                                onMouseMove={handleCanvasMouseMove}
                                onMouseUp={handleCanvasMouseUp}
                            >
                                <div style={{
                                    position: 'absolute',
                                    border: `2px solid ${aiFire ? 'var(--accent-red)' : (aiSmoke ? 'var(--accent-amber)' : 'var(--accent-cyan)')}`,
                                    background: aiFire ? 'rgba(255, 59, 48, 0.1)' : (aiSmoke ? 'rgba(255, 159, 10, 0.1)' : 'rgba(6, 182, 212, 0.1)'),
                                    boxShadow: `0 0 8px ${aiFire ? 'rgba(255, 59, 48, 0.4)' : (aiSmoke ? 'rgba(255, 159, 10, 0.4)' : 'rgba(6, 182, 212, 0.4)')}`,
                                    left: `${(bboxX / 960) * 100}%`,
                                    top: `${(bboxY / 540) * 100}%`,
                                    width: `${(bboxW / 960) * 100}%`,
                                    height: `${(bboxH / 540) * 100}%`,
                                    pointerEvents: 'none',
                                    transition: isDrawing ? 'none' : 'all 0.15s ease'
                                }}>
                                    <span style={{
                                        position: 'absolute',
                                        top: '-18px',
                                        left: '-2px',
                                        background: aiFire ? 'var(--accent-red)' : (aiSmoke ? 'var(--accent-amber)' : 'var(--accent-cyan)'),
                                        color: '#000',
                                        fontWeight: 'bold',
                                        fontSize: '8px',
                                        padding: '1px 4px',
                                        borderRadius: '2px',
                                        fontFamily: 'monospace',
                                        textTransform: 'uppercase'
                                    }}>
                                        {aiFire ? 'Simulated Fire' : (aiSmoke ? 'Simulated Smoke' : (aiHuman ? 'Simulated Human' : 'Simulated Target'))}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginTop: '12px' }}>
                            <div style={{ background: 'rgba(6,10,19,0.3)', padding: '6px', borderRadius: '4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>X (LEFT)</div>
                                <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}>{bboxX}px</div>
                            </div>
                            <div style={{ background: 'rgba(6,10,19,0.3)', padding: '6px', borderRadius: '4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Y (TOP)</div>
                                <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}>{bboxY}px</div>
                            </div>
                            <div style={{ background: 'rgba(6,10,19,0.3)', padding: '6px', borderRadius: '4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>WIDTH</div>
                                <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}>{bboxW}px</div>
                            </div>
                            <div style={{ background: 'rgba(6,10,19,0.3)', padding: '6px', borderRadius: '4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>HEIGHT</div>
                                <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}>{bboxH}px</div>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-tech-action primary"
                        disabled={isTriggeringAI}
                        style={{ width: '100%', marginTop: '24px' }}
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

            {/* Face Recognition Controller Card */}
            <div className="settings-card">
                <h3 className="face-db-title">REAL-TIME FACE WATCHER SERVICE</h3>
                <div className="setting-toggle-item" style={{ marginTop: '15px' }}>
                    <div className="setting-toggle-info">
                        <span className="setting-toggle-label">AUTO FACE RECOGNITION</span>
                        <span className="setting-toggle-desc">Scan camera frames every 3s for face matching</span>
                    </div>
                    <label className="switch-container">
                        <input
                            type="checkbox"
                            checked={faceWatchActive}
                            onChange={toggleFaceWatch}
                        />
                        <span className="switch-slider"></span>
                    </label>
                </div>
                <p className="mqtt-health-desc" style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', marginTop: '12px' }}>
                    Service Status: <strong style={{ color: faceWatchActive ? 'var(--accent-cyan)' : 'var(--accent-red)' }}>
                        {faceWatchActive ? 'RUNNING' : 'STOPPED'}
                    </strong>
                </p>
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
                            backgroundColor: mqttConnected ? 'rgba(255, 94, 54, 0.1)' : 'rgba(255, 59, 48, 0.1)',
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
