/* components/AdminLayout.jsx */
import React, { useState } from 'react';
import { useSystem } from '../store/SystemContext';
import { useAuth } from '../context/AuthContext';
import { AdminOverview } from '../pages/admin/AdminOverview';
import { AdminUserControl } from '../pages/admin/AdminUserControl';
import { AdminCameraConfig } from '../pages/admin/AdminCameraConfig';
import { AdminFaceSettings } from '../pages/admin/AdminFaceSettings';
import { AdminSystemLogs } from '../pages/admin/AdminSystemLogs';
import { Settings } from '../pages/Settings';

export const AdminLayout = ({ onOpenChangePassword }) => {
    const { setViewMode } = useSystem();
    const { user, logout } = useAuth();
    const [adminActiveTab, setAdminActiveTab] = useState('overview');

    const renderAdminView = () => {
        switch (adminActiveTab) {
            case 'overview':
                return <AdminOverview />;
            case 'users':
                return <AdminUserControl />;
            case 'camera':
                return <AdminCameraConfig />;
            case 'faces':
                return <AdminFaceSettings />;
            case 'logs':
                return <AdminSystemLogs />;
            case 'settings':
                return <Settings />;
            default:
                return <AdminOverview />;
        }
    };

    return (
        <div className="admin-layout-container">
            {/* Left Sidebar Menu */}
            <aside className="admin-sidebar copper-texture">
                <div className="admin-brand-section">
                    <span className="admin-shield-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px var(--accent-cyan))' }}>
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                    </span>
                    <div className="brand-text-container">
                        <span className="brand-title" style={{ fontSize: '15px' }}>FIREEYE ADMIN</span>
                        <span className="brand-subtitle" style={{ fontSize: '8px', letterSpacing: '2px' }}>SECURITY CONSOLE</span>
                    </div>
                </div>

                <div className="admin-user-profile-badge">
                    <span className="user-avatar-dot"></span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="admin-user-name">{user?.full_name || user?.username}</span>
                        <span className="admin-user-role">{user?.role}</span>
                    </div>
                </div>

                <nav className="admin-nav-menu">
                    <button
                        className={`admin-nav-item ${adminActiveTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setAdminActiveTab('overview')}
                    >
                        <span className="admin-menu-icon" style={{ display: 'flex', alignItems: 'center' }}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10"/>
                                <line x1="12" y1="20" x2="12" y2="4"/>
                                <line x1="6" y1="20" x2="6" y2="14"/>
                            </svg>
                        </span>
                        System Health
                    </button>
                    <button
                        className={`admin-nav-item ${adminActiveTab === 'users' ? 'active' : ''}`}
                        onClick={() => setAdminActiveTab('users')}
                    >
                        <span className="admin-menu-icon" style={{ display: 'flex', alignItems: 'center' }}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        </span>
                        User Control
                    </button>
                    <button
                        className={`admin-nav-item ${adminActiveTab === 'camera' ? 'active' : ''}`}
                        onClick={() => setAdminActiveTab('camera')}
                    >
                        <span className="admin-menu-icon" style={{ display: 'flex', alignItems: 'center' }}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 7l-7 5 7 5V7z"/>
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                            </svg>
                        </span>
                        Camera & Zones
                    </button>
                    <button
                        className={`admin-nav-item ${adminActiveTab === 'faces' ? 'active' : ''}`}
                        onClick={() => setAdminActiveTab('faces')}
                    >
                        <span className="admin-menu-icon" style={{ display: 'flex', alignItems: 'center' }}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                        </span>
                        AI & Facial DB
                    </button>
                    <button
                        className={`admin-nav-item ${adminActiveTab === 'logs' ? 'active' : ''}`}
                        onClick={() => setAdminActiveTab('logs')}
                    >
                        <span className="admin-menu-icon" style={{ display: 'flex', alignItems: 'center' }}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                            </svg>
                        </span>
                        System Logs
                    </button>
                    <button
                        className={`admin-nav-item ${adminActiveTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setAdminActiveTab('settings')}
                    >
                        <span className="admin-menu-icon" style={{ display: 'flex', alignItems: 'center' }}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                            </svg>
                        </span>
                        System Simulation
                    </button>
                </nav>

                <div className="admin-sidebar-footer">
                    <button className="btn-exit-console" onClick={() => setViewMode('operator')}>
                        ← Back to Operator UI
                    </button>
                    <button className="btn-admin-change-pwd" onClick={onOpenChangePassword} style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="7.5" cy="15.5" r="5.5"/>
                            <path d="M21 2l-9.6 9.6"/>
                            <path d="M15.5 7.5L17.5 9.5"/>
                            <path d="M18.5 4.5L21.5 7.5"/>
                        </svg>
                        Change Password
                    </button>
                    <button className="btn-admin-logout" onClick={logout} style={{ marginTop: '8px' }}>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Right Main Content Panel */}
            <main className="admin-main-content">
                {renderAdminView()}
            </main>
        </div>
    );
};
