/* App.jsx */
import React, { useState, useEffect, useRef } from 'react';
import { SystemProvider, useSystem } from './store/SystemContext';
import { Navigation } from './navigation/Navigation';
import { TelemetrySidebar } from './components/TelemetrySidebar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { ChangePassword } from './components/ChangePassword';
import logoImg from './assets/image-removebg-preview.jpg';
import './App.css';

const BACKEND_IP = import.meta.env.VITE_BACKEND_IP || (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1');
const API_BASE_URL = `http://${BACKEND_IP}:8000`;

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

    const { user, logout } = useAuth();

    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const userDropdownRef = useRef(null);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
                setShowUserDropdown(false);
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
                        className={`nav-tab-btn ${activeTab === 'faces' ? 'active' : ''}`}
                        onClick={() => setActiveTab('faces')}
                    >
                        Face Database
                    </button>
                    <button
                        className={`nav-tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                        onClick={() => setActiveTab('events')}
                    >
                        Event Logs
                    </button>
                    {(user?.role === 'ADMIN' || user?.role === 'OWNER') && (
                        <button
                            className={`nav-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
                            onClick={() => {
                                localStorage.removeItem('admin_sub_tab');
                                setActiveTab('admin');
                            }}
                        >
                            Admin Panel
                        </button>
                    )}
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
                    
                    {/* Compact User Profile Dropdown */}
                    <div className="navbar-user-dropdown-container" ref={userDropdownRef}>
                        <button 
                            className="navbar-user-info-btn"
                            onClick={() => setShowUserDropdown(!showUserDropdown)}
                            title="Quản lý tài khoản"
                        >
                            <span className="user-icon-circle">👤</span>
                            <span className="user-display-name">{user?.full_name || user?.username}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>

                        {showUserDropdown && (
                            <div className="user-dropdown-menu">
                                <div className="user-menu-header">
                                    <span className="menu-user-name">{user?.full_name || user?.username}</span>
                                    <span className="menu-user-role-badge">{user?.role}</span>
                                </div>
                                {(user?.role === 'ADMIN' || user?.role === 'OWNER') && (
                                    <>
                                        <button className="menu-item-btn" onClick={() => { 
                                            localStorage.setItem('admin_sub_tab', 'settings');
                                            window.dispatchEvent(new Event('admin_sub_tab_changed'));
                                            setActiveTab('admin'); 
                                            setShowUserDropdown(false); 
                                        }}>
                                            ⚙️ Thiết Lập Hệ Thống
                                        </button>
                                        <hr className="menu-divider" />
                                    </>
                                )}
                                <button className="menu-item-btn btn-logout-menu" onClick={logout}>
                                    🚪 Đăng Xuất
                                </button>
                            </div>
                        )}
                    </div>
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
                    <p>ĐANG XÁC THỰC HỆ THỐNG FIREEYE...</p>
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

    return <MainLayout />;
};

function App() {
    return (
        <AuthProvider>
            <SystemProvider>
                <AppContent />
            </SystemProvider>
        </AuthProvider>
    );
}

export default App;
