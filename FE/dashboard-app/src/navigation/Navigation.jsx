/* navigation/Navigation.jsx */
import React from 'react';
import { useSystem } from '../store/SystemContext';
import { Dashboard } from '../pages/Dashboard';
import { FaceDatabase } from '../pages/FaceDatabase';
import { EventLogs } from '../pages/EventLogs';
import { Settings } from '../pages/Settings';

export const Navigation = () => {
    const { activeTab } = useSystem();

    switch (activeTab) {
        case 'dashboard':
            return <Dashboard />;
        case 'faces':
            return <FaceDatabase />;
        case 'events':
            return <EventLogs />;
        case 'settings':
            return <Settings />;
        default:
            return <Dashboard />;
    }
};
