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
    const canvasRef = useRef(null);

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

    // Draw dynamic AI bounding boxes on canvas overlay
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 960, 540);

        if (!hasBbox || overallAlertLevel === "safe") {
            return;
        }

        const [x1, y1, x2, y2] = aiBbox;
        const width = x2 - x1;
        const height = y2 - y1;

        // Bounding box style configuration
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = boxGlow;
        ctx.shadowBlur = 10;
        ctx.strokeRect(x1, y1, width, height);

        // Target HUD label background
        ctx.fillStyle = boxColor;
        ctx.shadowBlur = 0;
        ctx.fillRect(x1 - 1, y1 - 25, Math.max(120, width * 0.5), 25);

        // Text display details
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px monospace";
        ctx.fillText(`${targetClass}: ${(aiConfidence * 100).toFixed(0)}%`, x1 + 8, y1 - 8);
    }, [aiBbox, overallAlertLevel, boxColor, boxGlow, targetClass, aiConfidence, hasBbox]);

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
                            aspectRatio: '16/9',
                            width: 'auto',
                            height: 'auto',
                            maxWidth: '100%',
                            maxHeight: '100%',
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
                                objectFit: 'cover'
                            }}
                            onError={(e) => {
                                console.error("Camera stream load error");
                            }}
                        />

                        {/* YOLOv8 VISION HUD OVERLAY */}
                        <div className="yolov8-hud-overlay">
                            {/* Bounding Box Drawing via Responsive Canvas */}
                            <canvas 
                                ref={canvasRef} 
                                width={960} 
                                height={540} 
                                style={{ 
                                    position: 'absolute', 
                                    top: 0, 
                                    left: 0, 
                                    width: '100%', 
                                    height: '100%', 
                                    pointerEvents: 'none',
                                    zIndex: 15
                                }}
                            />

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
