/* App.jsx */
import React, { useState, useEffect, useRef } from 'react';
import { SystemProvider, useSystem } from './store/SystemContext';
import { Navigation } from './navigation/Navigation';
import { TelemetrySidebar } from './components/TelemetrySidebar';
import './App.css';

const API_BASE_URL = typeof window !== 'undefined' 
    ? `http://${window.location.hostname}:8000` 
    : "http://127.0.0.1:8000";

const MainLayout = () => {
    const {
        activeTab,
        setActiveTab,
        npuLoad,
        systemTemp,
        overallAlertLevel,
        triggerEmergencyStop,
        notifications,
        unreadCount,
        markAsRead
    } = useSystem();

    const [showNotifications, setShowNotifications] = useState(false);
    const dropdownRef = useRef(null);

    // Close notifications dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="app-container">
            {/* TOP NAVIGATION BAR */}
            <header className="top-navbar">
                <div className="brand-section">
                    {/* Futuristic Hexagonal Fire-Eye Logo */}
                    <svg className="logo-eye-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="flameColor" x1="20" y1="0" x2="80" y2="60" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#ff3b30" />
                                <stop offset="50%" stopColor="#f97316" />
                                <stop offset="100%" stopColor="#fbbf24" />
                            </linearGradient>
                            <linearGradient id="liquidColor" x1="0" y1="50" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#00f0ff" />
                                <stop offset="100%" stopColor="#2563eb" />
                            </linearGradient>
                            <linearGradient id="copperColor" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#c87533" />
                                <stop offset="100%" stopColor="#b87333" />
                            </linearGradient>
                        </defs>
                        
                        {/* Copper Traces */}
                        <path d="M50 50 L15 15 M50 50 L85 15 M50 50 L15 85 M50 50 L85 85 M50 50 L50 10 M50 50 L50 90" stroke="url(#copperColor)" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="3,3" />
                        <circle cx="15" cy="15" r="1.5" fill="#c87533" />
                        <circle cx="85" cy="15" r="1.5" fill="#c87533" />
                        <circle cx="15" cy="85" r="1.5" fill="#c87533" />
                        <circle cx="85" cy="85" r="1.5" fill="#c87533" />
                        <circle cx="50" cy="10" r="1.5" fill="#c87533" />
                        <circle cx="50" cy="90" r="1.5" fill="#c87533" />

                        {/* Orange-Red Flames */}
                        <path d="M15 50 C15 25 40 10 50 10 C60 10 85 25 85 50 C70 40 60 35 50 35 C40 35 30 40 15 50 Z" fill="url(#flameColor)" filter="drop-shadow(0 2px 4px rgba(255,59,48,0.4))" />
                        
                        {/* Blue Liquid Bottom Curve */}
                        <path d="M15 50 C15 75 40 90 50 90 C60 90 85 75 85 50 C70 60 60 65 50 65 C40 65 30 60 15 50 Z" fill="url(#liquidColor)" filter="drop-shadow(0 -2px 4px rgba(0,240,255,0.3))" />

                        {/* Hexagonal core */}
                        <polygon points="50 38, 61 44, 61 56, 50 62, 39 56, 39 44" fill="#0b132b" stroke="#00f0ff" strokeWidth="2.5" filter="drop-shadow(0 0 6px rgba(0,240,255,0.7))" />
                        
                        <circle cx="50" cy="50" r="3" fill="#00f0ff" />
                        <circle cx="50" cy="50" r="1" fill="#ffffff" />
                    </svg>
                    <div className="brand-text-container">
                        <span className="brand-title">FIREEYE CENTRAL</span>
                        <span className="brand-subtitle">AI SMART FIRE SURVEILLANCE</span>
                    </div>
                </div>

                {/* Page links (Top Nav tabs) */}
                <nav className="nav-tabs">
                    <button
                        className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        Dashboard
                    </button>
                    <button
                        className={`nav-tab-btn ${activeTab === 'faces' ? 'active' : ''}`}
                        onClick={() => setActiveTab('faces')}
                    >
                        Face Verification
                    </button>
                    <button
                        className={`nav-tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                        onClick={() => setActiveTab('events')}
                    >
                        Event Logs
                    </button>
                    <button
                        className={`nav-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        Settings
                    </button>
                </nav>

                {/* Controls and Indicators */}
                <div className="navbar-controls">
                    {/* Notifications center bell */}
                    <div className="notifications-bell-container" ref={dropdownRef}>
                        <button 
                            className={`btn-notification-bell ${unreadCount > 0 ? 'pulse' : ''}`}
                            onClick={() => setShowNotifications(!showNotifications)}
                            title="View Notifications logs"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="bell-icon">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                        </button>

                        {showNotifications && (
                            <div className="notifications-dropdown-menu">
                                <div className="dropdown-header">
                                    <span>THREAT DETECT LOGS</span>
                                    <span className="unread-stat">{unreadCount} UNREAD</span>
                                </div>
                                <div className="dropdown-items-list">
                                    {notifications.length === 0 ? (
                                        <div className="empty-notification-item">
                                            No events recorded. System safe.
                                        </div>
                                    ) : (
                                        notifications.map((n) => (
                                            <div 
                                                key={n.id} 
                                                className={`dropdown-notification-card ${n.is_read ? 'read' : 'unread'} ${n.risk_level?.toLowerCase() || ''}`}
                                            >
                                                <div className="card-status-strip"></div>
                                                <div className="card-main-content">
                                                    <div className="card-meta">
                                                        <span className="risk-level-badge">{n.risk_level}</span>
                                                        <span className="time-stamp">{n.created_at?.replace('T', ' ').substring(11, 19)}</span>
                                                    </div>
                                                    <div className="card-message">{n.message}</div>
                                                    
                                                    {n.snapshot_path && (
                                                        <div className="card-thumbnail-container" onClick={() => {
                                                            setActiveTab('events');
                                                            setShowNotifications(false);
                                                        }}>
                                                            <img 
                                                                src={`${API_BASE_URL}${n.snapshot_path}`} 
                                                                alt="Event snapshot" 
                                                                className="card-thumbnail"
                                                            />
                                                            <span className="thumbnail-hover-text">VIEW LOGS</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {!n.is_read && (
                                                    <button 
                                                        className="btn-mark-as-read"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            markAsRead(n.id);
                                                        }}
                                                        title="Mark as read"
                                                    >
                                                        ✓
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="sys-telemetry-pill">
                        <div className="telemetry-item">
                            NPU: <strong>{npuLoad.toFixed(0)}%</strong>
                        </div>
                        <div className="telemetry-item">
                            TEMP: <strong>{systemTemp.toFixed(1)}°C</strong>
                        </div>
                    </div>
                    <div className="system-status-indicator">
                        <span className="indicator-dot"></span>
                        <span className="indicator-text">SYSTEM ONLINE</span>
                    </div>
                    <button
                        className="btn-emergency-stop"
                        onClick={triggerEmergencyStop}
                        title="SHUTDOWN ALL OUTLETS & CLEAR ALARMS"
                    >
                        EMERGENCY STOP
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <div className="main-split-container">
                {/* Left viewport (70% on dashboard, 100% on other pages) */}
                <main className={`left-viewport ${activeTab !== 'dashboard' ? 'full-width' : ''}`}>
                    <Navigation />
                </main>

                {/* Right 30%: Console sidebar (Dashboard only) */}
                {activeTab === 'dashboard' && <TelemetrySidebar />}
            </div>
        </div>
    );
};

function App() {
    return (
        <SystemProvider>
            <MainLayout />
        </SystemProvider>
    );
}

export default App;
