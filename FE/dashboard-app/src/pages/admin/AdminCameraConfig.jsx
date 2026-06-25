/* pages/admin/AdminCameraConfig.jsx */
import React from 'react';
import { useSystem } from '../../store/SystemContext';
import { api } from '../../services/api';
import { VideoFeed } from '../../components/VideoFeed';

export const AdminCameraConfig = () => {
    const {
        isCameraOnline,
        isBackendConnected,
        autoScanActive,
        setAutoScanActive,
        zones,
        toggleZoneSprinkler,
        activeZoneId,
        setActiveZoneId
    } = useSystem();

    const handlePTZStart = async (action) => {
        if (!isCameraOnline || autoScanActive) return;
        setActiveZoneId(null); // Clear focus zone during manual rotation
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
        setActiveZoneId(null); // Return to default Home has no active zone focus
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

    const handleSetZonePreset = async (zoneId, zoneName) => {
        if (!isCameraOnline || !isBackendConnected) return;
        if (!window.confirm(`Overwrite current camera position as the preset for ${zoneName}?`)) return;
        try {
            const res = await api.setZonePreset(zoneId);
            if (res.success) {
                setActiveZoneId(zoneId); // Highlight as the active saved sector
                alert(`Successfully saved current position as preset for ${zoneName}!`);
            } else {
                alert(`Failed to save preset: ${res.message || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(`PTZ set zone preset error:`, err);
            alert(`Failed to save preset: ${err.message}`);
        }
    };

    const handleMoveToZone = async (zoneId) => {
        if (!isCameraOnline || !isBackendConnected) return;
        setAutoScanActive(false);
        setActiveZoneId(zoneId); // Focus the sector being navigated to
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
                
                {/* Left Side: Live Feed & PTZ Joystick */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Live Viewport */}
                    <div className="admin-config-card" style={{ padding: '12px' }}>
                        <h3 className="section-title" style={{ marginBottom: '10px' }}>CAMERA LIVE VIEW</h3>
                        <VideoFeed />
                    </div>

                    {/* PTZ Joystick and Auto Scan */}
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
                </div>

                {/* Right Side: Zones and Sprinklers manual override */}
                <div className="admin-config-card">
                    <h3 className="section-title">SECTOR PRESETS & OUTLETS</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                        Force camera transition to sectors or trigger manual fire extinguisher pumps.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {[1, 2, 3, 4].map(zoneId => {
                            const zoneData = zones[zoneId] || { pump: "OFF", temperature: 0.0, humidity: 0.0, gas: 1, online: false };
                            const zoneName = {
                                1: "Zone 01: Warehouse North",
                                2: "Zone 02: Loading Dock",
                                3: "Zone 03: Server Room",
                                4: "Zone 04: Office Suite"
                            }[zoneId];

                            const isOnline = zoneData.online !== false;
                            const isActiveZone = zoneId === activeZoneId;

                            return (
                                <div 
                                    key={zoneId} 
                                    style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        padding: '12px', 
                                        background: isActiveZone ? 'rgba(6, 182, 212, 0.1)' : 'rgba(6, 10, 19, 0.4)', 
                                        border: isActiveZone ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)', 
                                        borderRadius: '6px', 
                                        opacity: isOnline ? 1 : 0.8,
                                        boxShadow: isActiveZone ? '0 0 15px rgba(6, 182, 212, 0.2)' : 'none',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: isActiveZone ? '#ffffff' : 'var(--accent-cyan)' }}>
                                                {zoneName}
                                            </span>
                                            {isActiveZone && (
                                                <span style={{ fontSize: '9px', color: 'var(--accent-cyan)', fontWeight: 'bold', letterSpacing: '0.5px', textShadow: '0 0 4px var(--accent-cyan)' }}>
                                                    [ CAMERA POINTING HERE ]
                                                </span>
                                            )}
                                        </div>
                                        <span className={`status-dot-badge ${!isOnline ? 'offline' : (zoneData.pump === 'ON' ? 'online' : 'offline')}`} style={{ fontSize: '9px' }}>
                                            {!isOnline ? 'OFFLINE' : `PUMP: ${zoneData.pump}`}
                                        </span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                                        <button 
                                            className="btn-tech-action" 
                                            onClick={() => handleMoveToZone(zoneId)} 
                                            style={{ flexGrow: 1, fontSize: '9px', padding: '6px 2px', marginTop: 0 }}
                                            disabled={autoScanActive}
                                        >
                                            MOVE CAMERA
                                        </button>
                                        <button 
                                            className="btn-tech-action" 
                                            onClick={() => handleSetZonePreset(zoneId, zoneName)} 
                                            style={{ 
                                                flexGrow: 1, 
                                                fontSize: '9px', 
                                                padding: '6px 2px', 
                                                marginTop: 0,
                                                borderColor: '#f59e0b',
                                                color: '#f59e0b'
                                            }}
                                            disabled={autoScanActive}
                                        >
                                            SAVE POSITION
                                        </button>
                                        <button 
                                            className="btn-tech-action" 
                                            onClick={() => toggleZoneSprinkler(zoneId)} 
                                            style={{ 
                                                flexGrow: 1, 
                                                fontSize: '9px', 
                                                padding: '6px 2px', 
                                                marginTop: 0,
                                                borderColor: !isOnline ? 'var(--text-muted)' : (zoneData.pump === 'ON' ? 'var(--accent-red)' : 'var(--accent-cyan)'),
                                                color: !isOnline ? 'var(--text-muted)' : (zoneData.pump === 'ON' ? 'var(--accent-red)' : 'var(--accent-cyan)'),
                                                opacity: !isOnline ? 0.5 : 1
                                            }}
                                            disabled={!isOnline}
                                        >
                                            {!isOnline ? 'PUMP N/A' : (zoneData.pump === 'ON' ? 'PUMP OFF' : 'PUMP ON')}
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
