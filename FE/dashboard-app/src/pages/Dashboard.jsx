/* pages/Dashboard.jsx */
import React from 'react';
import { VideoFeed } from '../components/VideoFeed';

export const Dashboard = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <VideoFeed />
        </div>
    );
};
