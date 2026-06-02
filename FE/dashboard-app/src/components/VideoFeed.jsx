/* components/VideoFeed.jsx */
import React from 'react';
import { useSystem } from '../store/SystemContext';
import { api } from '../services/api';

export const VideoFeed = () => {
    const {
        isCameraOnline,
        isBackendConnected,
        overallAlertLevel,
        aiFireDetected,
        aiSmokeDetected,
        smokeDetected,
        flameDetected,
        hailoStatus
    } = useSystem();

    const isAlerting = overallAlertLevel !== "safe" || aiFireDetected || aiSmokeDetected || flameDetected || smokeDetected;

    const showLive = isBackendConnected && isCameraOnline;

    return (
        <div className={`video-workspace-card ${isAlerting && showLive ? 'alert-active' : ''}`}>
            {/* Live Video Viewport */}
            <div className="video-viewport-wrapper">
                {showLive ? (
                    <>
                        <img
                            src={api.getStreamUrl()}
                            alt="RTSP Video Stream"
                            className="live-rtsp-feed"
                            onError={(e) => {
                                console.error("Camera stream load error");
                            }}
                        />



                        {/* YOLOv8 VISION HUD OVERLAY */}
                        <div className="yolov8-hud-overlay">
                            {/* Corner Brackets */}
                            <div className="hud-corner-bracket hud-bracket-tl"></div>
                            <div className="hud-corner-bracket hud-bracket-tr"></div>
                            <div className="hud-corner-bracket hud-bracket-bl"></div>
                            <div className="hud-corner-bracket hud-bracket-br"></div>

                            {/* HUD Telemetry text */}
                            <div className="hud-telemetry-header">
                                <div>DEV_CLASS: RASPBERRY_PI_5</div>
                                <div>ACCEL: HAILO-8L ({hailoStatus ? hailoStatus.toUpperCase() : "OFFLINE"})</div>
                                <div className={isAlerting ? 'hud-telemetry-pulse' : ''}>
                                    {isAlerting ? 'ALERT STATE: TRIGGERED' : 'SYSTEM STATUS: SECURE'}
                                </div>
                            </div>

                            <div className="hud-telemetry-footer">
                                <div>LATENCY: 142ms</div>
                                <div>STREAM_TYPE: H.264_FLOW</div>
                                <div>VISION_HUD: YOLOv8_FIRE</div>
                            </div>

                            {/* Scanner line beam */}
                            <div className={`hud-scanner-line ${isAlerting ? 'danger' : ''}`}></div>

                            {/* Center Crosshair */}
                            <div className="hud-crosshair">
                                <div className="hud-crosshair-circle"></div>
                            </div>

                        </div>
                    </>
                ) : (
                    <div className="offline-placeholder">
                        <span className="offline-pulse-dot"></span>
                        Offline
                    </div>
                )}
            </div>
        </div>
    );
};
