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
        aiConfidence,
        smokeDetected,
        flameDetected,
        aiBbox
    } = useSystem();

    const isAlerting = overallAlertLevel !== "safe" || aiFireDetected || aiSmokeDetected || flameDetected || smokeDetected;

    let bboxStyle = { display: 'none' };
    if (isAlerting) {
        if (aiBbox && aiBbox.length === 4) {
            const [x1, y1, x2, y2] = aiBbox;
            bboxStyle = {
                left: `${(x1 / 9.6).toFixed(1)}%`,
                top: `${(y1 / 5.4).toFixed(1)}%`,
                width: `${((x2 - x1) / 9.6).toFixed(1)}%`,
                height: `${((y2 - y1) / 5.4).toFixed(1)}%`,
                display: 'block'
            };
        } else {
            // Default simulated fallback bounding box coordinates
            bboxStyle = {
                left: '42.5%',
                top: '40.5%',
                width: '18.7%',
                height: '31.5%',
                display: 'block'
            };
        }
    }

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
                                <div>ACCEL: HAILO-8L (ACTIVE)</div>
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
