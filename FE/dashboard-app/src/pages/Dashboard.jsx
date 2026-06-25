/* pages/Dashboard.jsx */
import React, { useEffect } from 'react';
import { VideoFeed } from '../components/VideoFeed';
import { useSystem } from '../store/SystemContext';
import { api } from '../services/api';

export const Dashboard = () => {
    const {
        isCameraOnline,
        autoScanActive,
        isPTZVisible,
        setIsPTZVisible
    } = useSystem();

    const handlePTZStart = async (action) => {
        if (!isCameraOnline || autoScanActive) return;
        try {
            await api.sendPTZCommand(action);
        } catch (err) {
            console.error(`PTZ ${action} start error:`, err);
        }
    };

    const handlePTZStop = async (action) => {
        if (!isCameraOnline || autoScanActive) return;
        try {
            await api.sendPTZCommand('stop', { code: action });
        } catch (err) {
            console.error("PTZ stop error:", err);
        }
    };

    const handleHardStop = async () => {
        if (!isCameraOnline || autoScanActive) return;
        try {
            await api.sendPTZCommand('stop');
        } catch (err) {
            console.error("PTZ hard stop error:", err);
        }
    };

    // Operator Hotkeys for PTZ Control
    useEffect(() => {
        if (!isCameraOnline || autoScanActive) return;

        const activeKeys = new Set();

        const handleKeyDown = (e) => {
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                return;
            }

            const key = e.key;
            if (activeKeys.has(key)) return;

            if (key === 'ArrowUp') {
                e.preventDefault();
                activeKeys.add(key);
                handlePTZStart('up');
            } else if (key === 'ArrowDown') {
                e.preventDefault();
                activeKeys.add(key);
                handlePTZStart('down');
            } else if (key === 'ArrowLeft') {
                e.preventDefault();
                activeKeys.add(key);
                handlePTZStart('left');
            } else if (key === 'ArrowRight') {
                e.preventDefault();
                activeKeys.add(key);
                handlePTZStart('right');
            } else if (key === '+' || key === '=') {
                e.preventDefault();
                activeKeys.add(key);
                handlePTZStart('zoom-in');
            } else if (key === '-' || key === '_') {
                e.preventDefault();
                activeKeys.add(key);
                handlePTZStart('zoom-out');
            } else if (key === ' ') {
                e.preventDefault();
                handleHardStop();
            }
        };

        const handleKeyUp = (e) => {
            const key = e.key;
            if (!activeKeys.has(key)) return;

            activeKeys.delete(key);

            if (key === 'ArrowUp') {
                handlePTZStop('up');
            } else if (key === 'ArrowDown') {
                handlePTZStop('down');
            } else if (key === 'ArrowLeft') {
                handlePTZStop('left');
            } else if (key === 'ArrowRight') {
                handlePTZStop('right');
            } else if (key === '+' || key === '=') {
                handlePTZStop('zoom-in');
            } else if (key === '-' || key === '_') {
                handlePTZStop('zoom-out');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isCameraOnline, autoScanActive]);

    return (
        <div className="dashboard-layout-container">
            {/* Top Row: Video Feed */}
            <div className="dashboard-video-section" style={{ position: 'relative' }}>
                <VideoFeed />
                
                {/* Floating Show Button if PTZ is hidden and Auto-Scan is disabled */}
                {!isPTZVisible && !autoScanActive && (
                    <button 
                        onClick={() => setIsPTZVisible(true)} 
                        className="btn-tech-action" 
                        style={{ 
                            position: 'absolute',
                            bottom: '16px',
                            right: '24px',
                            zIndex: 20,
                            padding: '8px 16px', 
                            fontSize: '11px', 
                            marginTop: 0, 
                            boxShadow: '0 0 15px rgba(255, 94, 54, 0.4)',
                            background: 'rgba(13, 15, 20, 0.85)',
                            backdropFilter: 'blur(4px)',
                            border: '1px solid var(--accent-cyan)',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--text-primary)'
                        }}
                        title="Show PTZ camera controls panel"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '12px', height: '12px', color: 'var(--accent-cyan)' }}>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        SHOW PTZ CONTROLS
                    </button>
                )}
            </div>

            {/* Bottom Row: PTZ Camera Control (hidden if Auto-Scan is active) */}
            {isPTZVisible && !autoScanActive && (
                <div className="dashboard-ptz-section">
                    <div className="module-header" style={{ width: '100%', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="module-title" style={{ color: 'var(--accent-cyan)' }}>
                            <span className="hex-icon-wrapper" style={{ marginRight: '8px' }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '13px', height: '13px' }}>
                                    <circle cx="12" cy="12" r="10"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            </span>
                            PTZ CAM CONTROL
                        </h3>
                        <button 
                            onClick={() => setIsPTZVisible(false)} 
                            className="btn-tech-action" 
                            style={{ 
                                padding: '6px 12px', 
                                fontSize: '10px', 
                                marginTop: 0, 
                                border: '1px solid rgba(255, 94, 54, 0.3)', 
                                background: 'rgba(255, 94, 54, 0.05)', 
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: 'var(--accent-cyan)'
                            }}
                            title="Hide PTZ Controls"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '12px', height: '12px' }}>
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                <line x1="1" y1="1" x2="23" y2="23"/>
                            </svg>
                            HIDE PANEL
                        </button>
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
            )}
        </div>
    );
};
