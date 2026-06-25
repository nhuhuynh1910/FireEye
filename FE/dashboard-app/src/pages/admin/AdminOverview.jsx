/* pages/admin/AdminOverview.jsx */
import React from 'react';
import { useSystem } from '../../store/SystemContext';

export const AdminOverview = () => {
    const {
        isBackendConnected,
        isCameraOnline,
        npuLoad,
        systemTemp,
        mqttConnected,
        faceWatchActive,
        autoScanActive,
        overallAlertLevel,
        sprinklerState
    } = useSystem();

    return (
        <div className="admin-view-panel">
            <div className="admin-view-header">
                <h2>SYSTEM HEALTH & DIAGNOSTICS</h2>
                <p>Real-time physical telemetry and logical services status logs</p>
            </div>

            {/* Diagnostics Stats Grid */}
            <div className="admin-stats-grid">
                {/* Hardware NPU */}
                <div className="admin-stat-card glow-cyan">
                    <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '24px' }}>
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px var(--accent-cyan))' }}>
                            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
                            <rect x="9" y="9" width="6" height="6"/>
                            <line x1="9" y1="1" x2="9" y2="4"/>
                            <line x1="15" y1="1" x2="15" y2="4"/>
                            <line x1="9" y1="20" x2="9" y2="23"/>
                            <line x1="15" y1="20" x2="15" y2="23"/>
                            <line x1="20" y1="9" x2="23" y2="9"/>
                            <line x1="20" y1="15" x2="23" y2="15"/>
                            <line x1="1" y1="9" x2="4" y2="9"/>
                            <line x1="1" y1="15" x2="4" y2="15"/>
                        </svg>
                    </div>
                    <div className="stat-label">AI NPU ACCELERATOR LOAD</div>
                    <div className="stat-value">{npuLoad.toFixed(1)}%</div>
                    <div className="stat-desc">Hailo-8L Neural Processing Unit</div>
                    <div className="progress-bar-container">
                        <div className="progress-bar-fill cyan" style={{ width: `${Math.min(100, npuLoad)}%` }}></div>
                    </div>
                </div>

                {/* System Temp */}
                <div className="admin-stat-card glow-amber">
                    <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '24px' }}>
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--accent-amber)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px var(--accent-amber))' }}>
                            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
                        </svg>
                    </div>
                    <div className="stat-label">CPU CORE TEMPERATURE</div>
                    <div className="stat-value">{systemTemp.toFixed(1)}°C</div>
                    <div className="stat-desc">Raspberry Pi 5 SoC Thermal sensor</div>
                    <div className="progress-bar-container">
                        <div className="progress-bar-fill amber" style={{ width: `${Math.min(100, (systemTemp / 85) * 100)}%` }}></div>
                    </div>
                </div>

                {/* Overall Threat status */}
                <div className={`admin-stat-card ${overallAlertLevel === 'danger' ? 'glow-red' : (overallAlertLevel === 'warning' ? 'glow-amber' : 'glow-green')}`}>
                    <div className="stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '24px' }}>
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={overallAlertLevel === 'danger' ? 'var(--accent-red)' : (overallAlertLevel === 'warning' ? 'var(--accent-amber)' : '#10b981')} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${overallAlertLevel === 'danger' ? 'var(--accent-red)' : (overallAlertLevel === 'warning' ? 'var(--accent-amber)' : '#10b981')})` }}>
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                    </div>
                    <div className="stat-label">SYSTEM THREAT LEVEL</div>
                    <div className="stat-value" style={{ color: overallAlertLevel === 'danger' ? 'var(--accent-red)' : (overallAlertLevel === 'warning' ? 'var(--accent-amber)' : '#10b981') }}>
                        {overallAlertLevel.toUpperCase()}
                    </div>
                    <div className="stat-desc">Active threat evaluation module</div>
                </div>
            </div>

            {/* Services Status Roster */}
            <div className="admin-card-section" style={{ marginTop: '24px' }}>
                <h3 className="section-title">LOGICAL DAEMONS & SERVICES</h3>
                <div className="services-status-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>SERVICE DAEMON</th>
                                <th>NETWORK HOST / ENDPOINT</th>
                                <th>HEARTBEAT STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>FastAPI Application Backend</td>
                                <td><code>http://127.0.0.1:8000</code></td>
                                <td>
                                    <span className={`status-dot-badge ${isBackendConnected ? 'online' : 'offline'}`}>
                                        {isBackendConnected ? 'ONLINE (ACTIVE)' : 'OFFLINE (DISCONNECTED)'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td>Dahua IP RTSP Camera Stream</td>
                                <td><code>rtsp://10.10.131.30:554/cam/realmonitor</code></td>
                                <td>
                                    <span className={`status-dot-badge ${isCameraOnline ? 'online' : 'offline'}`}>
                                        {isCameraOnline ? 'STREAMING (ONLINE)' : 'NO_SIGNAL (OFFLINE)'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td>MQTT Broker Connection</td>
                                <td><code>mqtt://127.0.0.1:1883</code></td>
                                <td>
                                    <span className={`status-dot-badge ${mqttConnected ? 'online' : 'offline'}`}>
                                        {mqttConnected ? 'CONNECTED' : 'DISCONNECTED'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td>Continuous Face Watcher Service</td>
                                <td><code>Dahua Live Capture Pipeline</code></td>
                                <td>
                                    <span className={`status-dot-badge ${faceWatchActive ? 'online' : 'offline'}`}>
                                        {faceWatchActive ? 'ACTIVE (SCANNING)' : 'STANDBY (DEACTIVATED)'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td>PTZ Patrol AutoScan Worker</td>
                                <td><code>Camera PTZ Presets 1-4</code></td>
                                <td>
                                    <span className={`status-dot-badge ${autoScanActive ? 'online' : 'offline'}`}>
                                        {autoScanActive ? 'PATROLLING' : 'IDLE'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td>Industrial Sprinkler Outlets</td>
                                <td><code>ESP32 MQTT Relay Node</code></td>
                                <td>
                                    <span className={`status-dot-badge ${sprinklerState === 'ON' ? 'online' : 'offline'}`}>
                                        {sprinklerState === 'ON' ? 'PUMP ACTIVE' : 'PUMP SHUTDOWN (STANDBY)'}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
