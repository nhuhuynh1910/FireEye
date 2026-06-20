/* components/AdminLayout.jsx */
import React, { useState } from 'react';
import { useSystem } from '../store/SystemContext';
import { useAuth } from '../context/AuthContext';
import { AdminOverview } from '../pages/admin/AdminOverview';
import { AdminUserControl } from '../pages/admin/AdminUserControl';
import { AdminCameraConfig } from '../pages/admin/AdminCameraConfig';
import { AdminFaceSettings } from '../pages/admin/AdminFaceSettings';
import { AdminSystemLogs } from '../pages/admin/AdminSystemLogs';

export const AdminLayout = () => {
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
            default:
                return <AdminOverview />;
        }
    };

    return (
        <div className="admin-layout-container">
            {/* Left Sidebar Menu */}
            <aside className="admin-sidebar copper-texture">
                <div className="admin-brand-section">
                    <span className="admin-shield-icon">🛡️</span>
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
                        <span className="admin-menu-icon">📊</span>
                        System Health
                    </button>
                    <button
                        className={`admin-nav-item ${adminActiveTab === 'users' ? 'active' : ''}`}
                        onClick={() => setAdminActiveTab('users')}
                    >
                        <span className="admin-menu-icon">👥</span>
                        User Control
                    </button>
                    <button
                        className={`admin-nav-item ${adminActiveTab === 'camera' ? 'active' : ''}`}
                        onClick={() => setAdminActiveTab('camera')}
                    >
                        <span className="admin-menu-icon">🎥</span>
                        Camera & Zones
                    </button>
                    <button
                        className={`admin-nav-item ${adminActiveTab === 'faces' ? 'active' : ''}`}
                        onClick={() => setAdminActiveTab('faces')}
                    >
                        <span className="admin-menu-icon">👤</span>
                        AI & Facial DB
                    </button>
                    <button
                        className={`admin-nav-item ${adminActiveTab === 'logs' ? 'active' : ''}`}
                        onClick={() => setAdminActiveTab('logs')}
                    >
                        <span className="admin-menu-icon">📓</span>
                        Security Audit Logs
                    </button>
                </nav>

                <div className="admin-sidebar-footer">
                    <button className="btn-exit-console" onClick={() => setViewMode('operator')}>
                        ← Back to Operator UI
                    </button>
                    <button className="btn-admin-logout" onClick={logout}>
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
