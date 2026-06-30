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
        isCameraOnline,
        isBackendConnected,
        zones,
        toggleZoneSprinkler
    } = useSystem();

    const isZone1Alerting = overallAlertLevel !== "safe" || aiFireDetected || aiSmokeDetected || flameDetected || smokeDetected;

    const handleGoHome = async () => {
        if (!isCameraOnline || !isBackendConnected) return;
        setAutoScanActive(false); // Disable auto-scan when user manually triggers Home
        try {
            await api.goHome();
        } catch (err) {
            console.error("PTZ go home error:", err);
        }
    };

    return (
        <aside className="right-sidebar copper-texture">
            {/* AUTO SCAN MODULE */}
            <div className="sidebar-module" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <div className="module-header" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', width: '100%' }}>
                    <h3 className="module-title" style={{ color: 'var(--accent-cyan)', flexGrow: 1 }}>
                        <span className="hex-icon-wrapper">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        </span>
                        CAMERA PATROL
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isBackendConnected && isCameraOnline && (
                            <button
                                onClick={handleGoHome}
                                title="Return to default angle"
                                style={{
                                    background: 'rgba(6, 182, 212, 0.1)',
                                    border: '1px solid var(--accent-cyan, #06b6d4)',
                                    borderRadius: '4px',
                                    color: 'var(--accent-cyan, #06b6d4)',
                                    padding: '4px 8px',
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--accent-cyan, #06b6d4)';
                                    e.currentTarget.style.color = '#020408';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
                                    e.currentTarget.style.color = 'var(--accent-cyan, #06b6d4)';
                                }}
                            >
                                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                                <span>HOME</span>
                            </button>
                        )}
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
            </div>

            {/* BOTTOM MODULE: Zone Control stack */}
            <div className="sidebar-module grow" style={{ paddingTop: '16px' }}>
                <div className="module-header">
                    <h3 className="module-title">
                        <span className="hex-icon-wrapper">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </span>
                        ZONE STATUS MONITOR
                    </h3>
                </div>

                <div className="zone-cards-stack">
                    {[1, 2, 3, 4].map(zoneId => {
                        const zoneData = zones[zoneId] || { temperature: 0.0, humidity: 0.0, gas: 0, pump: "OFF", buzzer: "OFF", mode: "MANUAL", online: false };
                        const zoneMeta = {
                            1: { name: "Zone 01: Warehouse North", desc: "Main Storage Sector" },
                            2: { name: "Zone 02: Loading Dock", desc: "Cargo Bays A-F" },
                            3: { name: "Zone 03: Server Room", desc: "IT Infrastructure Node" },
                            4: { name: "Zone 04: Office Suite", desc: "Administrative Wing" }
                        }[zoneId];

                        const isOnline = zoneData.online !== false;
                        const isAlerting = isOnline && (Number(zoneData.gas) > 800 || (zoneId === 1 && isZone1Alerting));

                        let cardClass = 'safe-state';
                        let statusText = 'SAFE';
                        let statusClass = 'safe';

                        if (!isOnline) {
                            cardClass = 'offline-state';
                            statusText = 'OFFLINE';
                            statusClass = 'offline';
                        } else if (isAlerting) {
                            cardClass = 'alert-state';
                            statusText = 'ALARM';
                            statusClass = 'danger';
                        }

                        return (
                            <div key={zoneId} className={`zone-card ${cardClass}`}>
                                <div className="zone-card-top">
                                    <div className="zone-identity">
                                        <span className="zone-name">{zoneMeta.name}</span>
                                        <span className="zone-desc">{zoneMeta.desc}</span>
                                    </div>
                                    <span className={`zone-badge ${statusClass}`}>
                                        {statusText}
                                    </span>
                                </div>

                                <div className="zone-telemetry-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px', opacity: isOnline ? 1 : 0.5 }}>
                                    <div className="zone-telemetry-item" style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span className="zone-telemetry-label" style={{ fontSize: '9px', opacity: 0.7 }}>TEMP</span>
                                        <span className="zone-telemetry-value" style={{ fontSize: '12px', fontWeight: 'bold' }}>{isOnline ? `${zoneData.temperature.toFixed(1)}°C` : '---'}</span>
                                    </div>
                                    <div className="zone-telemetry-item" style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span className="zone-telemetry-label" style={{ fontSize: '9px', opacity: 0.7 }}>HUMIDITY</span>
                                        <span className="zone-telemetry-value" style={{ fontSize: '12px', fontWeight: 'bold' }}>{isOnline ? `${zoneData.humidity.toFixed(1)}%` : '---'}</span>
                                    </div>
                                    <div className="zone-telemetry-item" style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span className="zone-telemetry-label" style={{ fontSize: '9px', opacity: 0.7 }}>GAS</span>
                                        <span className="zone-telemetry-value" style={{ fontSize: '12px', fontWeight: 'bold', color: isAlerting ? 'var(--accent-red)' : 'inherit' }}>{isOnline ? zoneData.gas : '---'}</span>
                                    </div>
                                    <div className="zone-telemetry-item" style={{ display: 'flex', flexDirection: 'column', marginTop: '4px' }}>
                                        <span className="zone-telemetry-label" style={{ fontSize: '9px', opacity: 0.7 }}>PUMP</span>
                                        <span className="zone-telemetry-value" style={{ fontSize: '11px', fontWeight: 'bold', color: zoneData.pump === 'ON' ? 'var(--accent-cyan)' : 'inherit' }}>{isOnline ? zoneData.pump : '---'}</span>
                                    </div>
                                    <div className="zone-telemetry-item" style={{ display: 'flex', flexDirection: 'column', marginTop: '4px' }}>
                                        <span className="zone-telemetry-label" style={{ fontSize: '9px', opacity: 0.7 }}>BUZZER</span>
                                        <span className="zone-telemetry-value" style={{ fontSize: '11px', fontWeight: 'bold', color: zoneData.buzzer === 'ON' ? 'var(--accent-red)' : 'inherit' }}>{isOnline ? zoneData.buzzer : '---'}</span>
                                    </div>
                                    <div className="zone-telemetry-item" style={{ display: 'flex', flexDirection: 'column', marginTop: '4px' }}>
                                        <span className="zone-telemetry-label" style={{ fontSize: '9px', opacity: 0.7 }}>MODE</span>
                                        <span className="zone-telemetry-value" style={{ fontSize: '11px', fontWeight: 'bold' }}>{isOnline ? zoneData.mode : '---'}</span>
                                    </div>
                                </div>

                                <div className="zone-controls-wrapper" style={{ marginTop: '12px' }}>
                                    <button
                                        className={`btn-pump-control ${zoneData.pump === "ON" ? "active" : ""}`}
                                        onClick={() => toggleZoneSprinkler(zoneId)}
                                        style={{ width: '100%', padding: '6px', fontSize: '10px', fontWeight: 'bold', opacity: isOnline ? 1 : 0.5 }}
                                        disabled={!isOnline}
                                    >
                                        {!isOnline ? "PUMP N/A" : (zoneData.pump === "ON" ? "PUMP ACTIVE" : "PUMP SHUTOFF")}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
};
