/* pages/admin/AdminSystemLogs.jsx */
import React, { useState } from 'react';
import { API_BASE_URL } from '../../services/api';
import { useSystem } from '../../store/SystemContext';

export const AdminSystemLogs = () => {
    const { events, fetchEvents } = useSystem();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchEvents(100);
        } finally {
            setIsRefreshing(false);
        }
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return "";
        return timeStr.replace('T', ' ').substring(0, 19);
    };

    return (
        <div className="admin-view-panel">
            <div className="admin-view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <h2>SECURITY AUDIT SYSTEM LOGS</h2>
                    <p>Traverse chronological hardware warnings, sprinkler events and AI detections</p>
                </div>
                <button className="btn-tech-action" onClick={handleRefresh} disabled={isRefreshing} style={{ marginTop: 0 }}>
                    {isRefreshing ? "QUERYING SQL..." : "REFRESH LOGS"}
                </button>
            </div>

            <div className="admin-card-section">
                <div className="services-status-table-wrapper">
                    {isRefreshing && events.length === 0 ? (
                        <div style={{ padding: '20px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                            QUERYING TELEMETRY SQL SECURE JOURNAL...
                        </div>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>TIMESTAMP</th>
                                    <th>EVENT TYPE</th>
                                    <th>SOURCE</th>
                                    <th>RISK LEVEL</th>
                                    <th>CONFIDENCE</th>
                                    <th>MESSAGE</th>
                                    <th>MEDIA FRAME</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map((event) => (
                                    <tr key={event.id} onClick={() => setSelectedEvent(event)} style={{ cursor: 'pointer' }}>
                                        <td>#{event.id}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{formatTime(event.created_at)}</td>
                                        <td>
                                            <span className={`event-type-badge ${event.event_type?.toLowerCase() || ''}`}>
                                                {event.event_type}
                                            </span>
                                        </td>
                                        <td>{event.source}</td>
                                        <td>
                                            <span className={`risk-label-cell ${event.risk_level?.toLowerCase() || ''}`}>
                                                {event.risk_level}
                                            </span>
                                        </td>
                                        <td style={{ fontFamily: 'monospace' }}>
                                            {event.confidence ? `${(event.confidence * 100).toFixed(0)}%` : 'N/A'}
                                        </td>
                                        <td>{event.message}</td>
                                        <td>
                                            {event.snapshot_path ? (
                                                <span style={{ color: 'var(--accent-cyan)', textDecoration: 'underline', fontWeight: 'bold' }}>
                                                    VIEW FRAME
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>NO_MEDIA</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {events.length === 0 && (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                                            No threat events recorded in database yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* View Snapshot Modal */}
            {selectedEvent && (
                <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
                    <div
                        className={`modal-content-card ${selectedEvent.risk_level === 'EMERGENCY' || selectedEvent.risk_level === 'CRITICAL' || selectedEvent.risk_level === 'HIGH' ? 'alert-border' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h4 className="modal-title">
                                SECURITY EVENT SCHEDULER JOURNAL [#{selectedEvent.id}]
                            </h4>
                            <button className="btn-modal-close" onClick={() => setSelectedEvent(null)}>
                                &times;
                            </button>
                        </div>
                        <div className="modal-body">
                            {selectedEvent.snapshot_path ? (
                                <div className="modal-image-wrapper">
                                    <img
                                        src={`${API_BASE_URL}${selectedEvent.snapshot_path}`}
                                        alt={`Event ${selectedEvent.id} Snapshot`}
                                        style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                    />
                                </div>
                            ) : (
                                <div className="modal-image-wrapper" style={{ color: 'var(--text-muted)', fontFamily: 'monospace', padding: '40px', textAlign: 'center', background: 'var(--bg-deep)', borderRadius: '4px', border: '1px dashed var(--border-color)' }}>
                                    NO RECORDED IMAGE SNAPSHOT IN SQL DATABASE FILE
                                </div>
                            )}

                            <div className="modal-data-table" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>TIMESTAMP:</span> {formatTime(selectedEvent.created_at)}
                                </div>
                                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>EVENT TYPE:</span> {selectedEvent.event_type}
                                </div>
                                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>SOURCE:</span> {selectedEvent.source}
                                </div>
                                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>RISK LEVEL:</span>{' '}
                                    <span className={`risk-label-cell ${selectedEvent.risk_level?.toLowerCase() || ''}`}>
                                        {selectedEvent.risk_level}
                                    </span>
                                </div>
                                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>CONFIDENCE:</span>{' '}
                                    {selectedEvent.confidence ? `${(selectedEvent.confidence * 100).toFixed(1)}%` : 'N/A'}
                                </div>
                                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>JOURNAL MESSAGE:</span> {selectedEvent.message}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
