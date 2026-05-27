/* components/PTZController.jsx */
import React from 'react';
import { useSystem } from '../store/SystemContext';
import { api } from '../services/api';

export const PTZController = () => {
    const { activeCameraId, isCameraOnline } = useSystem();

    const cameraNames = {
        1: "Front Gate",
        2: "Parking Lot",
        3: "Lobby",
        4: "Back Door"
    };
    
    const activeName = cameraNames[activeCameraId] || "Camera";

    const handlePTZStart = async (action) => {
        if (activeCameraId !== 1 || !isCameraOnline) {
            console.warn(`PTZ [${action}] ignored: Live camera (Front Gate) is offline.`);
            return;
        }
        try {
            await api.sendPTZCommand(action);
        } catch (err) {
            console.error(`PTZ ${action} start error:`, err);
        }
    };

    const handlePTZStop = async (action) => {
        if (activeCameraId !== 1 || !isCameraOnline) return;
        try {
            await api.sendPTZCommand('stop', { code: action });
        } catch (err) {
            console.error("PTZ stop error:", err);
        }
    };

    const handleStopClick = async () => {
        if (activeCameraId !== 1 || !isCameraOnline) return;
        try {
            await api.sendPTZCommand('stop');
        } catch (err) {
            console.error("PTZ hard stop error:", err);
        }
    };

    const renderDirectionBtn = (className, action, icon) => (
        <button
            className={`dpad-btn ${className}`}
            title={`Pan ${action}`}
            onMouseDown={() => handlePTZStart(action)}
            onMouseUp={() => handlePTZStop(action)}
            onMouseLeave={() => handlePTZStop(action)}
            onTouchStart={(e) => {
                e.preventDefault();
                handlePTZStart(action);
            }}
            onTouchEnd={(e) => {
                e.preventDefault();
                handlePTZStop(action);
            }}
        >
            {icon}
        </button>
    );

    const isControllable = activeCameraId === 1 && isCameraOnline;

    return (
        <div className="ptz-controls-card" style={{ opacity: isControllable ? 1 : 0.6 }}>
            <div className="ptz-header">
                <span className="ptz-title">PTZ Controller ({activeName})</span>
                <span className="ptz-sub">
                    {isControllable ? "Dahua SDK Command Mode" : "Simulation Mode (Locked)"}
                </span>
            </div>
            <div className="ptz-body">
                <div className="dpad-container">
                    {renderDirectionBtn("up", "up", (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="18 15 12 9 6 15"/>
                        </svg>
                    ))}
                    {renderDirectionBtn("left", "left", (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="15 18 9 12 15 6"/>
                        </svg>
                    ))}
                    
                    <button
                        className="dpad-center"
                        title="Stop Movement"
                        onClick={handleStopClick}
                    >
                        <div className="stop-dot"></div>
                    </button>
                    
                    {renderDirectionBtn("right", "right", (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    ))}
                    {renderDirectionBtn("down", "down", (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="6 9 12 15 18 9"/>
                        </svg>
                    ))}
                </div>
                <div className="zoom-controls">
                    <button
                        className="zoom-btn"
                        onMouseDown={() => handlePTZStart('zoom-in')}
                        onMouseUp={() => handlePTZStop('zoom-in')}
                        onMouseLeave={() => handlePTZStop('zoom-in')}
                        onTouchStart={(e) => {
                            e.preventDefault();
                            handlePTZStart('zoom-in');
                        }}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            handlePTZStop('zoom-in');
                        }}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        <span>ZOOM +</span>
                    </button>
                    
                    <button
                        className="zoom-btn"
                        onMouseDown={() => handlePTZStart('zoom-out')}
                        onMouseUp={() => handlePTZStop('zoom-out')}
                        onMouseLeave={() => handlePTZStop('zoom-out')}
                        onTouchStart={(e) => {
                            e.preventDefault();
                            handlePTZStart('zoom-out');
                        }}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            handlePTZStop('zoom-out');
                        }}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        <span>ZOOM -</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
