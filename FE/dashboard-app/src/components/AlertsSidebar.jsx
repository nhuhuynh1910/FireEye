/* components/AlertsSidebar.jsx */
import React, { useEffect, useRef } from 'react';
import { useSystem } from '../store/SystemContext';

// Helper Alert Thumbnail drawing using canvas
const AlertThumb = ({ desc }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw visual abstract shapes for alert context
        ctx.fillStyle = "#0c0d10";
        ctx.fillRect(0, 0, 54, 40);
        
        if (desc.includes("Back Door")) {
            ctx.fillStyle = "rgba(255, 59, 48, 0.4)";
            ctx.fillRect(10, 10, 34, 20);
            ctx.strokeStyle = "#ff3b30";
            ctx.lineWidth = 1;
            ctx.strokeRect(10, 10, 34, 20);
        } else if (desc.includes("Front Gate")) {
            ctx.strokeStyle = "#39ff14";
            ctx.lineWidth = 1;
            ctx.strokeRect(15, 8, 24, 24);
            ctx.fillStyle = "rgba(57, 255, 20, 0.2)";
            ctx.beginPath();
            ctx.arc(27, 20, 8, 0, 2 * Math.PI);
            ctx.fill();
        } else {
            ctx.fillStyle = "#1e222b";
            ctx.fillRect(4, 4, 46, 32);
            ctx.strokeStyle = "#00f0ff";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(4, 20);
            ctx.lineTo(50, 20);
            ctx.stroke();
        }
    }, [desc]);

    return (
        <div className="alert-thumb-container">
            <canvas ref={canvasRef} width={54} height={40} className="alert-thumb" />
        </div>
    );
};

export const AlertsSidebar = () => {
    const {
        alerts,
        smokeValue,
        flameValue,
        smokeDetected,
        flameDetected
    } = useSystem();

    return (
        <aside className="sidebar-right">
            <div className="sidebar-header">
                <h2>Recent Alerts</h2>
            </div>
            <div className="alerts-feed">
                {alerts.map(alert => (
                    <div
                        key={alert.id}
                        className={`alert-item ${alert.isNew ? 'new-alert' : ''}`}
                    >
                        <AlertThumb desc={alert.desc} />
                        <div className="alert-details">
                            <span className="alert-time">[{alert.time}]</span>
                            <span className="alert-desc">{alert.desc}</span>
                        </div>
                        {alert.isNew && <span className="alert-badge-dot" />}
                    </div>
                ))}
            </div>
            
            <div className="sensor-stats-card">
                <div className="card-header">
                    <h3>IoT Sensors</h3>
                    <span className="pulse-indicator" />
                </div>
                <div className="sensor-grid">
                    <div
                        className="sensor-tile"
                        id="sensor-smoke"
                        style={{ borderColor: smokeDetected ? 'var(--accent-red)' : 'var(--border-color)' }}
                    >
                        <span className="tile-label">SMOKE</span>
                        <span className="tile-value">{smokeValue} ppm</span>
                        <span className={`tile-status ${smokeDetected ? 'alarm' : ''}`}>
                            {smokeDetected ? 'ALARM' : 'NORMAL'}
                        </span>
                    </div>
                    <div
                        className="sensor-tile"
                        id="sensor-flame"
                        style={{ borderColor: flameDetected ? 'var(--accent-red)' : 'var(--border-color)' }}
                    >
                        <span className="tile-label">FLAME</span>
                        <span className="tile-value">{flameValue}%</span>
                        <span className={`tile-status ${flameDetected ? 'alarm' : ''}`}>
                            {flameDetected ? 'ALARM' : 'NORMAL'}
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
};
