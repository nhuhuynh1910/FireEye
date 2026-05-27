/* App.jsx */
import React from 'react';
import { SystemProvider, useSystem } from './store/SystemContext';
import { Sidebar } from './components/Sidebar';
import { AlertsSidebar } from './components/AlertsSidebar';
import { Navigation } from './navigation/Navigation';
import './App.css';

const MainLayout = () => {
    const { activeTab, isCameraOnline } = useSystem();

    const getPageTitle = () => {
        switch (activeTab) {
            case 'dashboard': return 'Dashboard';
            case 'playback': return 'Archive Playback';
            case 'cameras': return 'Cameras Manager';
            case 'settings': return 'System Settings';
            default: return 'Dashboard';
        }
    };

    return (
        <div className="app-container">
            {/* LEFT NAVIGATION SIDEBAR */}
            <Sidebar />

            {/* MAIN VIEWER PORT */}
            <main className="main-content">
                <header className="main-header">
                    <div className="header-title-container">
                        <h1 id="page-title">{getPageTitle()}</h1>
                    </div>
                    <div className="header-status-container">
                        <div className="status-indicator">
                            <span className="status-dot online"></span>
                            <span className="status-text">System is online</span>
                        </div>
                        <div className="status-indicator">
                            <span className={`status-dot ${isCameraOnline ? 'connected' : 'error'}`}></span>
                            <span className="status-text">
                                {isCameraOnline ? 'Dahua Cam Connected' : 'Dahua Cam Offline'}
                            </span>
                        </div>
                    </div>
                </header>

                {/* CURRENT ROUTE VIEW */}
                <Navigation />
            </main>

            {/* RIGHT ALERTS & SENSOR PANEL */}
            <AlertsSidebar />
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
