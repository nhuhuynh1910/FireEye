/* pages/Dashboard.jsx */
import React, { useState, useEffect, useRef } from 'react';
import { useSystem } from '../store/SystemContext';
import { useCanvasSim } from '../hooks/useCanvasSim';
import { PTZController } from '../components/PTZController';
import { formatTimestamp } from '../utils/helpers';
import { api } from '../services/api';

const CameraCard = ({ id, name, label, isActive, onSelect, showLiveStream }) => {
    const canvasRef = useRef(null);
    const [timestamp, setTimestamp] = useState("");
    useCanvasSim(canvasRef, name);

    useEffect(() => {
        const updateTime = () => setTimestamp(formatTimestamp(new Date()));
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    const showImgFeed = id === 1 && showLiveStream;

    return (
        <div
            className={`camera-card ${isActive ? 'active-card' : ''}`}
            onClick={onSelect}
        >
            <div className="video-container">
                {showImgFeed ? (
                    <img
                        src={api.getStreamUrl()}
                        alt="Live Stream Feed"
                        className="live-stream-feed"
                    />
                ) : (
                    <canvas ref={canvasRef} className="mock-canvas" />
                )}
                <div className="scanning-line" />
            </div>
            
            <div className="camera-overlay-top">
                <span className="camera-badge">LIVE</span>
                <span className="camera-name">{label}</span>
            </div>
            
            <div className="camera-overlay-bottom">
                <span className="camera-timestamp">{timestamp}</span>
                <span className="camera-signal">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                        <path d="M12 20h.01M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 14 0M1.5 9.5a15 15 0 0 1 21 0"/>
                    </svg>
                    {id === 1 ? '100%' : id === 2 ? '92%' : id === 3 ? '98%' : '85%'}
                </span>
            </div>
        </div>
    );
};

export const Dashboard = () => {
    const {
        activeCameraId,
        setActiveCameraId,
        is2x2Layout,
        setIs2x2Layout,
        isCameraOnline
    } = useSystem();

    const cameras = [
        { id: 1, name: "Front Gate", label: "Front Gate - Camera 01" },
        { id: 2, name: "Parking Lot", label: "Parking Lot - Camera 02" },
        { id: 3, name: "Lobby", label: "Lobby - Camera 03" },
        { id: 4, name: "Back Door", label: "Back Door - Camera 04" }
    ];

    const [isSingleMode, setIsSingleMode] = useState(!is2x2Layout);

    const toggleLayout2x2 = () => {
        setIs2x2Layout(true);
        setIsSingleMode(false);
    };

    const toggleLayoutSingle = () => {
        setIs2x2Layout(false);
        setIsSingleMode(true);
    };

    return (
        <div className="grid-layout-container">
            <div className={`camera-grid ${isSingleMode ? 'single-mode' : ''}`}>
                {cameras.map(cam => (
                    <CameraCard
                        key={cam.id}
                        id={cam.id}
                        name={cam.name}
                        label={cam.label}
                        isActive={activeCameraId === cam.id}
                        onSelect={() => setActiveCameraId(cam.id)}
                        showLiveStream={isCameraOnline}
                    />
                ))}
            </div>

            <div className="control-panel-container">
                <div className="grid-controls">
                    <button
                        className={`ctrl-btn ${!isSingleMode ? 'active' : ''}`}
                        onClick={toggleLayout2x2}
                        title="2x2 Grid View"
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7"/>
                            <rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/>
                        </svg>
                        <span>2x2 Layout</span>
                    </button>
                    
                    <button
                        className={`ctrl-btn ${isSingleMode ? 'active' : ''}`}
                        onClick={toggleLayoutSingle}
                        title="Focus Active Camera"
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                        </svg>
                        <span>Focus Feed</span>
                    </button>
                    
                    <button className="ctrl-btn" title="Show details info">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                        <span>Stream Details</span>
                    </button>
                </div>

                <PTZController />
            </div>
        </div>
    );
};
