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
            <div className="sidebar-header" style={{ padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
                <div className="logo-container">
                    <svg className="logo-icon" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="flameGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#f97316" />
                                <stop offset="100%" stopColor="#ef4444" />
                            </linearGradient>
                            <linearGradient id="swooshGrad" x1="0" y1="50" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#0ea5e9" />
                                <stop offset="100%" stopColor="#2563eb" />
                            </linearGradient>
                            <linearGradient id="hexGrad" x1="30" y1="30" x2="70" y2="70" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#1e3a8a" />
                                <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                        </defs>
                        <path d="M15,65 C30,85 70,85 85,65 C70,75 30,75 15,65 Z" fill="url(#swooshGrad)" />
                        <path d="M22,72 C35,88 65,88 78,72 C65,80 35,80 22,72 Z" fill="url(#swooshGrad)" opacity="0.6" />
                        <path d="M50,10 C62,25 75,40 75,55 C75,70 60,80 50,80 C40,80 25,70 25,55 C25,40 38,25 50,10 Z M50,22 C42,32 35,45 35,55 C35,63 42,70 50,70 C58,70 65,63 65,55 C65,45 58,32 50,22 Z" fill="url(#flameGrad)" />
                        <path d="M50,28 L50,42" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                        <circle cx="50" cy="42" r="3" fill="white" />
                        <path d="M58,34 L58,44" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                        <circle cx="58" cy="44" r="3" fill="white" />
                        <polygon points="50,40 60,46 60,57 50,63 40,57 40,46" fill="url(#hexGrad)" stroke="#60a5fa" strokeWidth="2" />
                        <circle cx="50" cy="51.5" r="4" fill="#38bdf8" />
                        <circle cx="50" cy="51.5" r="1.5" fill="white" />
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
