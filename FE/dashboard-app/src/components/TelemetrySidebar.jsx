/* components/TelemetrySidebar.jsx */
import React from 'react';
import { useSystem } from '../store/SystemContext';
import { api } from '../services/api';

export const TelemetrySidebar = () => {
    const {
        overallAlertLevel,
        smokeValue,
        flameValue,
        smokeDetected,
        flameDetected,
        aiFireDetected,
        aiSmokeDetected,
        sprinklerState,
        toggleSprinkler,
        autoScanActive,
        setAutoScanActive,
        isCameraOnline
    } = useSystem();

    const isZone1Alerting = overallAlertLevel !== "safe" || aiFireDetected || aiSmokeDetected || flameDetected || smokeDetected;

    const handlePTZStart = async (action) => {
        if (!isCameraOnline) return;
        try {
            await api.sendPTZCommand(action);
        } catch (err) {
            console.error(`PTZ ${action} start error:`, err);
        }
    };

    const handlePTZStop = async (action) => {
        if (!isCameraOnline) return;
        try {
            await api.sendPTZCommand('stop', { code: action });
        } catch (err) {
            console.error("PTZ stop error:", err);
        }
    };

    const handleHardStop = async () => {
        if (!isCameraOnline) return;
        try {
            await api.sendPTZCommand('stop');
        } catch (err) {
            console.error("PTZ hard stop error:", err);
        }
    };

    return (
        <aside className="right-sidebar copper-texture">
            {/* TOP MODULE: PTZ joystic & Scan */}
            <div className="sidebar-module">
                <div className="module-header">
                    <h3 className="module-title">
                        <span className="hex-icon-wrapper">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </span>
                        PTZ CAM CONTROL
                    </h3>
                    <div className="autoscan-container">
                        <span className="autoscan-label">Auto-Scan</span>
                        <label className="switch-container">
                            <input
                                type="checkbox"
                                checked={autoScanActive}
                                onChange={(e) => setAutoScanActive(e.target.checked)}
                            />
                            <span className="switch-slider"></span>
                        </label>
                    </div>
                </div>

                {/* Hexagonal PTZ Controls */}
                <div className="ptz-joystick-grid">
                    {/* Up */}
                    <button
                        className="ptz-hex-btn up"
                        title="Pan Up"
                        onMouseDown={() => handlePTZStart('up')}
                        onMouseUp={() => handlePTZStop('up')}
                        onMouseLeave={() => handlePTZStop('up')}
                        onTouchStart={(e) => { e.preventDefault(); handlePTZStart('up'); }}
                        onTouchEnd={(e) => { e.preventDefault(); handlePTZStop('up'); }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <polyline points="18 15 12 9 6 15"/>
                        </svg>
                    </button>

                    {/* Left */}
                    <button
                        className="ptz-hex-btn left"
                        title="Pan Left"
                        onMouseDown={() => handlePTZStart('left')}
                        onMouseUp={() => handlePTZStop('left')}
                        onMouseLeave={() => handlePTZStop('left')}
                        onTouchStart={(e) => { e.preventDefault(); handlePTZStart('left'); }}
                        onTouchEnd={(e) => { e.preventDefault(); handlePTZStop('left'); }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <polyline points="15 18 9 12 15 6"/>
                        </svg>
                    </button>

                    {/* Stop Core */}
                    <button
                        className="ptz-hex-btn center-stop"
                        title="STOP MOVEMENT"
                        onClick={handleHardStop}
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="6" width="12" height="12" rx="1"/>
                        </svg>
                    </button>

                    {/* Right */}
                    <button
                        className="ptz-hex-btn right"
                        title="Pan Right"
                        onMouseDown={() => handlePTZStart('right')}
                        onMouseUp={() => handlePTZStop('right')}
                        onMouseLeave={() => handlePTZStop('right')}
                        onTouchStart={(e) => { e.preventDefault(); handlePTZStart('right'); }}
                        onTouchEnd={(e) => { e.preventDefault(); handlePTZStop('right'); }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </button>

                    {/* Down */}
                    <button
                        className="ptz-hex-btn down"
                        title="Pan Down"
                        onMouseDown={() => handlePTZStart('down')}
                        onMouseUp={() => handlePTZStop('down')}
                        onMouseLeave={() => handlePTZStop('down')}
                        onTouchStart={(e) => { e.preventDefault(); handlePTZStart('down'); }}
                        onTouchEnd={(e) => { e.preventDefault(); handlePTZStop('down'); }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <polyline points="6 9 12 15 18 9"/>
                        </svg>
                    </button>

                    {/* Zoom In */}
                    <button
                        className="ptz-hex-btn zoom-in"
                        title="Zoom In"
                        onMouseDown={() => handlePTZStart('zoom-in')}
                        onMouseUp={() => handlePTZStop('zoom-in')}
                        onMouseLeave={() => handlePTZStop('zoom-in')}
                        onTouchStart={(e) => { e.preventDefault(); handlePTZStart('zoom-in'); }}
                        onTouchEnd={(e) => { e.preventDefault(); handlePTZStop('zoom-in'); }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                    </button>

                    {/* Zoom Out */}
                    <button
                        className="ptz-hex-btn zoom-out"
                        title="Zoom Out"
                        onMouseDown={() => handlePTZStart('zoom-out')}
                        onMouseUp={() => handlePTZStop('zoom-out')}
                        onMouseLeave={() => handlePTZStop('zoom-out')}
                        onTouchStart={(e) => { e.preventDefault(); handlePTZStart('zoom-out'); }}
                        onTouchEnd={(e) => { e.preventDefault(); handlePTZStop('zoom-out'); }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* BOTTOM MODULE: Zone Control stack */}
            <div className="sidebar-module grow">
                <div className="module-header">
                    <h3 className="module-title">
                        <span className="hex-icon-wrapper">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                            </svg>
                        </span>
                        ZONE STATUS MONITOR
                    </h3>
                </div>

                <div className="zone-cards-stack">
                    {/* Zone 1 (Alerting/Active) */}
                    <div className={`zone-card ${isZone1Alerting ? 'alert-state' : 'safe-state'}`}>
                        <div className="zone-card-top">
                            <div className="zone-identity">
                                <span className="zone-name">Zone 01: Warehouse North</span>
                                <span className="zone-desc">Main Storage Sector</span>
                            </div>
                            <span className={`zone-badge ${isZone1Alerting ? 'danger' : 'safe'}`}>
                                {isZone1Alerting ? 'ALARM' : 'SAFE'}
                            </span>
                        </div>
                        
                        <div className="zone-telemetry-grid">
                            <div className="zone-telemetry-item">
                                <span className="zone-telemetry-label">FLAME LEVEL</span>
                                <span className="zone-telemetry-value">{flameValue}%</span>
                            </div>
                            <div className="zone-telemetry-item">
                                <span className="zone-telemetry-label">SMOKE VALUE</span>
                                <span className="zone-telemetry-value">{smokeValue} ppm</span>
                            </div>
                        </div>

                        <div className="zone-controls-wrapper">
                            <button
                                className={`btn-pump-control ${sprinklerState === "ON" ? "active" : ""}`}
                                onClick={toggleSprinkler}
                            >
                                {sprinklerState === "ON" ? "PUMP ACTIVE" : "PUMP SHUTOFF"}
                            </button>
                        </div>
                    </div>

                    {/* Zone 2 (Safe) */}
                    <div className="zone-card safe-state">
                        <div className="zone-card-top">
                            <div className="zone-identity">
                                <span className="zone-name">Zone 02: Loading Dock</span>
                                <span className="zone-desc">Cargo Bays A-F</span>
                            </div>
                            <span className="zone-badge safe">SAFE</span>
                        </div>
                        <div className="zone-telemetry-grid">
                            <div className="zone-telemetry-item">
                                <span className="zone-telemetry-label">FLAME LEVEL</span>
                                <span className="zone-telemetry-value">0%</span>
                            </div>
                            <div className="zone-telemetry-item">
                                <span className="zone-telemetry-label">SMOKE VALUE</span>
                                <span className="zone-telemetry-value">12 ppm</span>
                            </div>
                        </div>
                    </div>

                    {/* Zone 3 (Safe) */}
                    <div className="zone-card safe-state">
                        <div className="zone-card-top">
                            <div className="zone-identity">
                                <span className="zone-name">Zone 03: Office Suite</span>
                                <span className="zone-desc">Administrative Wing</span>
                            </div>
                            <span className="zone-badge safe">SAFE</span>
                        </div>
                        <div className="zone-telemetry-grid">
                            <div className="zone-telemetry-item">
                                <span className="zone-telemetry-label">FLAME LEVEL</span>
                                <span className="zone-telemetry-value">0%</span>
                            </div>
                            <div className="zone-telemetry-item">
                                <span className="zone-telemetry-label">SMOKE VALUE</span>
                                <span className="zone-telemetry-value">8 ppm</span>
                            </div>
                        </div>
                    </div>

                    {/* Zone 4 (Safe) */}
                    <div className="zone-card safe-state">
                        <div className="zone-card-top">
                            <div className="zone-identity">
                                <span className="zone-name">Zone 04: Server Room</span>
                                <span className="zone-desc">IT Infrastructure Node</span>
                            </div>
                            <span className="zone-badge safe">SAFE</span>
                        </div>
                        <div className="zone-telemetry-grid">
                            <div className="zone-telemetry-item">
                                <span className="zone-telemetry-label">FLAME LEVEL</span>
                                <span className="zone-telemetry-value">0%</span>
                            </div>
                            <div className="zone-telemetry-item">
                                <span className="zone-telemetry-label">SMOKE VALUE</span>
                                <span className="zone-telemetry-value">4 ppm</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};
