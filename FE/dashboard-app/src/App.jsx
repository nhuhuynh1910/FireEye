/* App.jsx */
import React, { useState, useEffect, useRef } from 'react';
import { SystemProvider, useSystem } from './store/SystemContext';
import { Navigation } from './navigation/Navigation';
import { TelemetrySidebar } from './components/TelemetrySidebar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { ChangePassword } from './components/ChangePassword';
import { AdminLayout } from './components/AdminLayout';
import { SafetyVoteModal } from './components/SafetyVoteModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import logoImg from './assets/image-removebg-preview.jpg';
import './App.css';

import { API_BASE_URL } from './services/api';

const MainLayout = ({ onOpenChangePassword }) => {
    const {
        activeTab,
        setActiveTab,
        npuLoad,
        systemTemp,
        overallAlertLevel,
        triggerEmergencyStop,
        notifications,
        unreadCount,
        markAsRead,
        setViewMode
    } = useSystem();

    const { user, logout } = useAuth();

    const [showNotifications, setShowNotifications] = useState(false);
    const dropdownRef = useRef(null);

    const handleEmergencyStopClick = () => {
        if (window.confirm("WARNING: Are you sure you want to trigger EMERGENCY STOP? This will immediately shutdown all sprinkler outlets and clear active threat levels!")) {
            triggerEmergencyStop();
        }
    };

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
                    <img src={logoImg} className="logo-eye-svg" alt="FireEye Logo" />
                    <div className="brand-text-container">
                        <span className="brand-title">FireEye AI System</span>
                        <span className="brand-subtitle">Powered by AI</span>
                    </div>
                </div>

                <nav className="nav-tabs">
                    <button
                        className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        Dashboard
                    </button>
                    <button
                        className={`nav-tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                        onClick={() => setActiveTab('events')}
                    >
                        Event Logs
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

                    
                    {/* User profile & logout controls */}
                    <div className="navbar-user-info">
                        <span className="user-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                        </span>
                        <div className="user-labels">
                            <span className="user-name">{user?.full_name || user?.username}</span>
                            <span className="user-role">{user?.role}</span>
                        </div>
                    </div>

                    {(user?.role === 'ADMIN' || user?.role === 'OWNER') && (
                        <button className="btn-admin-console-header" onClick={() => setViewMode('admin')} title="Open Administrator Console" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                            Admin Console
                        </button>
                    )}

                    <button className="btn-change-password-header" onClick={onOpenChangePassword} title="Change account password">
                        Change Password
                    </button>

                    <button className="btn-logout-header" onClick={logout} title="Logout from system">
                        Logout
                    </button>

                    <div className="system-status-indicator">
                        <span className="indicator-dot"></span>
                        <span className="indicator-text">SYSTEM ONLINE</span>
                    </div>
                    
                    <button
                        className="btn-emergency-stop"
                        onClick={handleEmergencyStopClick}
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

const AppContent = () => {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) {
        return (
            <div className="auth-loading-screen">
                <div className="loader-container">
                    <span className="spinner"></span>
                    <p>AUTHENTICATING FIREEYE SYSTEM...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Login />;
    }

    if (user?.is_first_login) {
        return <ChangePassword />;
    }

    return (
        <SystemProvider>
            <AppViewport />
        </SystemProvider>
    );
};

const AppViewport = () => {
    const { viewMode } = useSystem();
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    return (
        <>
            {viewMode === 'admin' ? (
                <AdminLayout onOpenChangePassword={() => setShowChangePasswordModal(true)} />
            ) : (
                <MainLayout onOpenChangePassword={() => setShowChangePasswordModal(true)} />
            )}
            <SafetyVoteModal />
            {showChangePasswordModal && (
                <ChangePasswordModal onClose={() => setShowChangePasswordModal(false)} />
            )}
        </>
    );
};

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
