/* components/VideoFeed.jsx */
import React, { useState, useEffect, useRef } from 'react';
import { useSystem } from '../store/SystemContext';
import { api } from '../services/api';

export const VideoFeed = () => {
    const {
        isCameraOnline,
        isBackendConnected,
        overallAlertLevel,
        aiFireDetected,
        aiSmokeDetected,
        aiHumanDetected,
        aiConfidence,
        aiBbox,
        smokeDetected,
        flameDetected,
        hailoStatus
    } = useSystem();

    const [rotation, setRotation] = useState(0);
    const [scale, setScale] = useState(1);
    const wrapperRef = useRef(null);

    const handleRotate = () => {
        setRotation(prev => (prev + 90) % 360);
    };

    useEffect(() => {
        if (!wrapperRef.current) return;

        const updateScale = () => {
            if (!wrapperRef.current) return;
            const { width, height } = wrapperRef.current.getBoundingClientRect();
            if (rotation === 90 || rotation === 270) {
                const scaleFactor = Math.min(width / height, height / width);
                setScale(scaleFactor);
            } else {
                setScale(1);
            }
        };

        updateScale();

        const resizeObserver = new ResizeObserver(() => {
            updateScale();
        });
        resizeObserver.observe(wrapperRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [rotation]);

    const isAlerting = overallAlertLevel !== "safe" || aiFireDetected || aiSmokeDetected || aiHumanDetected || flameDetected || smokeDetected;

    const showLive = isBackendConnected && isCameraOnline;

    // Calculate bounding box percentages relative to 960x540 coordinates
    const hasBbox = aiBbox && aiBbox.length === 4;
    const shouldShowHtmlBbox = hasBbox && (!showLive || overallAlertLevel === "safe");
    const boxLeft = hasBbox ? (aiBbox[0] / 960) * 100 : 0;
    const boxTop = hasBbox ? (aiBbox[1] / 540) * 100 : 0;
    const boxWidth = hasBbox ? ((aiBbox[2] - aiBbox[0]) / 960) * 100 : 0;
    const boxHeight = hasBbox ? ((aiBbox[3] - aiBbox[1]) / 540) * 100 : 0;

    // Determine color & label based on target class
    let targetClass = "SAFE";
    let boxColor = "var(--accent-red)";
    let boxGlow = "rgba(255, 59, 48, 0.4)";

    if (aiFireDetected) {
        targetClass = "FIRE";
        boxColor = "#ff3b30";
        boxGlow = "rgba(255, 59, 48, 0.4)";
    } else if (aiSmokeDetected) {
        targetClass = "SMOKE";
        boxColor = "#ff9f0a";
        boxGlow = "rgba(255, 159, 10, 0.4)";
    } else if (aiHumanDetected) {
        targetClass = "HUMAN";
        boxColor = "#0ea5e9";
        boxGlow = "rgba(14, 165, 233, 0.4)";
    }

    return (
        <div className={`video-workspace-card ${isAlerting && showLive ? 'alert-active' : ''}`}>
            {/* Live Video Viewport */}
            <div className="video-viewport-wrapper" ref={wrapperRef}>
                {/* Floating Sci-Fi rotation control button */}
                {showLive && (
                    <button
                        className="hud-rotate-btn"
                        onClick={handleRotate}
                        title="Rotate Viewport"
                        style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            zIndex: 30,
                            background: 'rgba(10, 25, 47, 0.85)',
                            border: '1px solid var(--accent-cyan, #06b6d4)',
                            borderRadius: '6px',
                            color: 'var(--accent-cyan, #06b6d4)',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            transition: 'all 0.2s ease',
                            pointerEvents: 'auto',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), inset 0 0 6px rgba(6, 182, 212, 0.2)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--accent-cyan, #06b6d4)';
                            e.currentTarget.style.color = '#020408';
                            e.currentTarget.style.boxShadow = '0 0 12px var(--accent-cyan, #06b6d4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(10, 25, 47, 0.85)';
                            e.currentTarget.style.color = 'var(--accent-cyan, #06b6d4)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5), inset 0 0 6px rgba(6, 182, 212, 0.2)';
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                        </svg>
                        <span>Rotate {rotation}°</span>
                    </button>
                )}

                {showLive ? (
                    <div
                        className="video-stream-container"
                        style={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            transform: `rotate(${rotation}deg) scale(${scale})`,
                            transformOrigin: 'center center',
                            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        <img
                            src={api.getStreamUrl()}
                            alt="RTSP Video Stream"
                            className="live-rtsp-feed"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain'
                            }}
                            onError={(e) => {
                                console.error("Camera stream load error");
                            }}
                        />

                        {/* YOLOv8 VISION HUD OVERLAY */}
                        <div className="yolov8-hud-overlay">
                            {/* Bounding Box Drawing */}
                            {shouldShowHtmlBbox && (
                                <div
                                    className="hud-target-box"
                                    style={{
                                        left: `${boxLeft}%`,
                                        top: `${boxTop}%`,
                                        width: `${boxWidth}%`,
                                        height: `${boxHeight}%`,
                                        borderColor: boxColor,
                                        boxShadow: `0 0 15px ${boxGlow}, inset 0 0 10px ${boxGlow.replace("0.4", "0.2")}`
                                    }}
                                >
                                    <div 
                                        className="hud-target-label"
                                        style={{
                                            background: boxColor,
                                            boxShadow: `0 -2px 8px ${boxGlow}`
                                        }}
                                    >
                                        <span className="hud-alert-pulse"></span>
                                        {targetClass}: {(aiConfidence * 100).toFixed(0)}%
                                    </div>
                                </div>
                            )}

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
                    </div>
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
