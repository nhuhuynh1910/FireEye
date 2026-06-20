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
                    <div className="stat-icon">🧠</div>
                    <div className="stat-label">AI NPU ACCELERATOR LOAD</div>
                    <div className="stat-value">{npuLoad.toFixed(1)}%</div>
                    <div className="stat-desc">Hailo-8L Neural Processing Unit</div>
                    <div className="progress-bar-container">
                        <div className="progress-bar-fill cyan" style={{ width: `${Math.min(100, npuLoad)}%` }}></div>
                    </div>
                </div>

                {/* System Temp */}
                <div className="admin-stat-card glow-amber">
                    <div className="stat-icon">🌡️</div>
                    <div className="stat-label">CPU CORE TEMPERATURE</div>
                    <div className="stat-value">{systemTemp.toFixed(1)}°C</div>
                    <div className="stat-desc">Raspberry Pi 5 SoC Thermal sensor</div>
                    <div className="progress-bar-container">
                        <div className="progress-bar-fill amber" style={{ width: `${Math.min(100, (systemTemp / 85) * 100)}%` }}></div>
                    </div>
                </div>

                {/* Overall Threat status */}
                <div className={`admin-stat-card ${overallAlertLevel === 'danger' ? 'glow-red' : (overallAlertLevel === 'warning' ? 'glow-amber' : 'glow-green')}`}>
                    <div className="stat-icon">🛡️</div>
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
