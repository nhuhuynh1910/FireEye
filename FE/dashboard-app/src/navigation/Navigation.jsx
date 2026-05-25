/* navigation/Navigation.jsx */
import React from 'react';
import { useSystem } from '../store/SystemContext';
import { Dashboard } from '../pages/Dashboard';
import { Playback } from '../pages/Playback';
import { CamerasList } from '../pages/CamerasList';
import { Settings } from '../pages/Settings';

export const Navigation = () => {
    const { activeTab } = useSystem();

    switch (activeTab) {
        case 'dashboard':
            return <Dashboard />;
        case 'playback':
            return <Playback />;
        case 'cameras':
            return <CamerasList />;
        case 'settings':
            return <Settings />;
        default:
            return <Dashboard />;
    }
};
