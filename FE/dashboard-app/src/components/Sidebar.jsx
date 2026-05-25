/* components/Sidebar.jsx */
import React from 'react';
import { useSystem } from '../store/SystemContext';

export const Sidebar = () => {
    const { activeTab, setActiveTab, npuLoad, systemTemp } = useSystem();

    const menuItems = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: (
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="9" rx="1"/>
                    <rect x="14" y="3" width="7" height="5" rx="1"/>
                    <rect x="14" y="12" width="7" height="9" rx="1"/>
                    <rect x="3" y="16" width="7" height="5" rx="1"/>
                </svg>
            )
        },
        {
            id: 'playback',
            label: 'Playback',
            icon: (
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polygon points="10 8 16 12 10 16 10 8"/>
                </svg>
            )
        },
        {
            id: 'cameras',
            label: 'Cameras List',
            icon: (
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                </svg>
            )
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: (
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
            )
        }
    ];

    return (
        <aside className="sidebar-left">
            <div class="sidebar-header" style={{ padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
                <div className="logo-container">
                    <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <circle cx="12" cy="11" r="3"/>
                    </svg>
                    <div className="logo-text">
                        <span className="brand-name">FIREEYE</span>
                        <span className="brand-sub">SURVEILLANCE</span>
                    </div>
                </div>
            </div>
            
            <nav className="nav-menu">
                {menuItems.map(item => (
                    <a
                        key={item.id}
                        href="#"
                        className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            setActiveTab(item.id);
                        }}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </a>
                ))}
            </nav>
            
            <div className="sidebar-footer">
                <div className="system-health">
                    <div className="health-item">
                        <span className="health-label">NPU Load</span>
                        <div className="health-bar-container">
                            <div className="health-bar" style={{ width: `${npuLoad}%` }}></div>
                        </div>
                        <span className="health-value">{npuLoad.toFixed(1)}%</span>
                    </div>
                    <div className="health-item">
                        <span className="health-label">System Temp</span>
                        <span className="health-value">{systemTemp.toFixed(1)}°C</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};
