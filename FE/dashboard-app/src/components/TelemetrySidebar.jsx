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
        setAutoScanActive
    } = useSystem();

    const isZone1Alerting = overallAlertLevel !== "safe" || aiFireDetected || aiSmokeDetected || flameDetected || smokeDetected;



    return (
        <aside className="right-sidebar copper-texture">
            {/* AUTO SCAN MODULE */}
            <div className="sidebar-module" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <div className="module-header" style={{ marginBottom: 0 }}>
                    <h3 className="module-title" style={{ color: 'var(--accent-cyan)' }}>
                        <span className="hex-icon-wrapper">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </span>
                        CAMERA PATROL
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
            </div>

            {/* BOTTOM MODULE: Zone Control stack */}
            <div className="sidebar-module grow" style={{ paddingTop: '16px' }}>
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
