/* pages/admin/AdminCameraConfig.jsx */
import React from 'react';
import { useSystem } from '../../store/SystemContext';
import { api } from '../../services/api';

export const AdminCameraConfig = () => {
    const {
        isCameraOnline,
        isBackendConnected,
        autoScanActive,
        setAutoScanActive,
        zones,
        toggleZoneSprinkler
    } = useSystem();

    const handlePTZStart = async (action) => {
        if (!isCameraOnline || autoScanActive) return;
        try {
            await api.sendPTZCommand(action);
        } catch (err) {
            console.error(`Admin PTZ ${action} start error:`, err);
        }
    };

    const handlePTZStop = async (action) => {
        if (!isCameraOnline || autoScanActive) return;
        try {
            await api.sendPTZCommand('stop', { code: action });
        } catch (err) {
            console.error("Admin PTZ stop error:", err);
        }
    };

    const handleHardStop = async () => {
        if (!isCameraOnline || autoScanActive) return;
        try {
            await api.sendPTZCommand('stop');
        } catch (err) {
            console.error("Admin PTZ hard stop error:", err);
        }
    };

    const handleGoHome = async () => {
        if (!isCameraOnline || !isBackendConnected) return;
        setAutoScanActive(false);
        try {
            await api.goHome();
            alert("Camera returned to default Home position.");
        } catch (err) {
            console.error("PTZ go home error:", err);
        }
    };

    const handleSetHome = async () => {
        if (!isCameraOnline || !isBackendConnected) return;
        if (!window.confirm("Overwrite current camera position as the default Home position?")) return;
        try {
            const res = await api.setHome();
            if (res.success) {
                alert("Successfully saved current position as default Home!");
            }
        } catch (err) {
            console.error("PTZ set home error:", err);
        }
    };

    const handleMoveToZone = async (zoneId) => {
        if (!isCameraOnline || !isBackendConnected) return;
        setAutoScanActive(false);
        try {
            await api.moveToZone(zoneId);
        } catch (err) {
            console.error(`Failed to move camera to zone ${zoneId}:`, err);
        }
    };

    return (
        <div className="admin-view-panel">
            <div className="admin-view-header">
                <h2>PTZ CAMERA & ZONE SETTINGS</h2>
                <p>Align hardware telemetry, configure patrol scanning presets, and manual trigger controls</p>
            </div>

            <div className="admin-grid-layout" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginTop: '16px' }}>
                
                {/* Left Side: PTZ Joystick and Auto Scan */}
                <div className="admin-config-card">
                    <h3 className="section-title">HARDWARE PTZ JOYSTICK</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                        Manual overrides are disabled during active patrol auto-scanning.
                    </p>

                    {/* AutoScan Status Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-deep)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                        <div>
                            <span style={{ fontWeight: 'bold', fontSize: '12px' }}>PATROL AUTO-SCANNING patrol</span>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Rotate camera through Zones 1-4 every 15 seconds</div>
                        </div>
                        <label className="switch-container">
                            <input
                                type="checkbox"
                                checked={autoScanActive}
                                onChange={(e) => setAutoScanActive(e.target.checked)}
                            />
                            <span className="switch-slider"></span>
                        </label>
                    </div>

                    {/* PTZ Joystick */}
                    <div className="ptz-joystick-grid" style={{ pointerEvents: autoScanActive ? 'none' : 'auto', opacity: autoScanActive ? 0.35 : 1 }}>
                        {/* Up */}
                        <button
                            className="ptz-hex-btn up"
                            title="Pan Up"
                            onMouseDown={() => handlePTZStart('up')}
                            onMouseUp={() => handlePTZStop('up')}
                            onMouseLeave={() => handlePTZStop('up')}
                        >
                            ▲
                        </button>

                        {/* Left */}
                        <button
                            className="ptz-hex-btn left"
                            title="Pan Left"
                            onMouseDown={() => handlePTZStart('left')}
                            onMouseUp={() => handlePTZStop('left')}
                            onMouseLeave={() => handlePTZStop('left')}
                        >
                            ◀
                        </button>

                        {/* Center Stop */}
                        <button
                            className="ptz-hex-btn center-stop"
                            title="STOP MOVEMENT"
                            onClick={handleHardStop}
                        >
                            ■
                        </button>

                        {/* Right */}
                        <button
                            className="ptz-hex-btn right"
                            title="Pan Right"
                            onMouseDown={() => handlePTZStart('right')}
                            onMouseUp={() => handlePTZStop('right')}
                            onMouseLeave={() => handlePTZStop('right')}
                        >
                            ▶
                        </button>

                        {/* Down */}
                        <button
                            className="ptz-hex-btn down"
                            title="Pan Down"
                            onMouseDown={() => handlePTZStart('down')}
                            onMouseUp={() => handlePTZStop('down')}
                            onMouseLeave={() => handlePTZStop('down')}
                        >
                            ▼
                        </button>

                        {/* Zoom In */}
                        <button
                            className="ptz-hex-btn zoom-in"
                            title="Zoom In"
                            onMouseDown={() => handlePTZStart('zoom-in')}
                            onMouseUp={() => handlePTZStop('zoom-in')}
                            onMouseLeave={() => handlePTZStop('zoom-in')}
                        >
                            +
                        </button>

                        {/* Zoom Out */}
                        <button
                            className="ptz-hex-btn zoom-out"
                            title="Zoom Out"
                            onMouseDown={() => handlePTZStart('zoom-out')}
                            onMouseUp={() => handlePTZStop('zoom-out')}
                            onMouseLeave={() => handlePTZStop('zoom-out')}
                        >
                            -
                        </button>
                    </div>

                    {/* Presets setup */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
                        <button className="btn-tech-action" onClick={handleGoHome} disabled={autoScanActive}>
                            GO HOME (PRESET 5)
                        </button>
                        <button className="btn-tech-action" onClick={handleSetHome} disabled={autoScanActive} style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>
                            SAVE CURRENT AS HOME
                        </button>
                    </div>
                </div>

                {/* Right Side: Zones and Sprinklers manual override */}
                <div className="admin-config-card">
                    <h3 className="section-title">SECTOR PRESETS & OUTLETS</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                        Force camera transition to sectors or trigger manual fire extinguisher pumps.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {[1, 2, 3, 4].map(zoneId => {
                            const zoneData = zones[zoneId] || { pump: "OFF", temperature: 0.0, humidity: 0.0, gas: 1 };
                            const zoneName = {
                                1: "Zone 01: Warehouse North",
                                2: "Zone 02: Loading Dock",
                                3: "Zone 03: Server Room",
                                4: "Zone 04: Office Suite"
                            }[zoneId];

                            return (
                                <div key={zoneId} style={{ display: 'flex', flexDirection: 'column', padding: '12px', background: 'rgba(6, 10, 19, 0.4)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{zoneName}</span>
                                        <span className={`status-dot-badge ${zoneData.pump === 'ON' ? 'online' : 'offline'}`} style={{ fontSize: '9px' }}>
                                            PUMP: {zoneData.pump}
                                        </span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                        <button 
                                            className="btn-tech-action" 
                                            onClick={() => handleMoveToZone(zoneId)} 
                                            style={{ flexGrow: 1, fontSize: '10px', padding: '6px', marginTop: 0 }}
                                            disabled={autoScanActive}
                                        >
                                            MOVE CAMERA HERE
                                        </button>
                                        <button 
                                            className="btn-tech-action" 
                                            onClick={() => toggleZoneSprinkler(zoneId)} 
                                            style={{ 
                                                flexGrow: 1, 
                                                fontSize: '10px', 
                                                padding: '6px', 
                                                marginTop: 0,
                                                borderColor: zoneData.pump === 'ON' ? 'var(--accent-red)' : 'var(--accent-cyan)',
                                                color: zoneData.pump === 'ON' ? 'var(--accent-red)' : 'var(--accent-cyan)'
                                            }}
                                        >
                                            {zoneData.pump === 'ON' ? 'FORCE PUMP OFF' : 'FORCE PUMP ON'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};
