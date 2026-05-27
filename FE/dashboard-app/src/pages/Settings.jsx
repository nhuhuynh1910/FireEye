/* pages/Settings.jsx */
import React, { useState } from 'react';

export const Settings = () => {
    const [smokeSens, setSmokeSens] = useState(12);
    const [flameSens, setFlameSens] = useState(8);
    const [aiDetection, setAiDetection] = useState(true);
    const [motionAlerts, setMotionAlerts] = useState(true);

    return (
        <div className="settings-container">
            <div className="settings-card">
                <h2>Surveillance Integration Settings</h2>
                <div className="settings-group">
                    <h3>Hardware Accessories</h3>
                    <div className="setting-item">
                        <label htmlFor="smoke-sensor-sim">Smoke Detection Sensitivity (Simulated): {smokeSens}</label>
                        <input
                            type="range"
                            id="smoke-sensor-sim"
                            min="0"
                            max="100"
                            value={smokeSens}
                            onChange={(e) => setSmokeSens(parseInt(e.target.value))}
                        />
                    </div>
                    <div className="setting-item">
                        <label htmlFor="flame-sensor-sim">Flame Detection Sensitivity (Simulated): {flameSens}</label>
                        <input
                            type="range"
                            id="flame-sensor-sim"
                            min="0"
                            max="100"
                            value={flameSens}
                            onChange={(e) => setFlameSens(parseInt(e.target.value))}
                        />
                    </div>
                </div>
                
                <div className="settings-group">
                    <h3>AI Intelligent Video Analytics</h3>
                    <div className="setting-item-toggle">
                        <span>Object Detection (NPU Accelerated)</span>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={aiDetection}
                                onChange={(e) => setAiDetection(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                    <div className="setting-item-toggle">
                        <span>Motion Detection Alerts</span>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={motionAlerts}
                                onChange={(e) => setMotionAlerts(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};
