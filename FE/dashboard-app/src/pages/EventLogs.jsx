import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../services/api';
import { useSystem } from '../store/SystemContext';

export const EventLogs = () => {
    const { events, fetchEvents } = useSystem();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [events.length]);

    const totalPages = Math.ceil(events.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentEvents = events.slice(indexOfFirstItem, indexOfLastItem);

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
        // sqlite stores created_at in UTC, convert to local or display raw
        return timeStr.replace('T', ' ').substring(0, 19);
    };

    return (
        <div className="events-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="face-db-title" style={{ marginBottom: 0 }}>SECURITY EVENT LOGS DATABASE</h3>
                <button className="btn-tech-action" onClick={handleRefresh} disabled={isRefreshing} style={{ marginTop: 0 }}>
                    {isRefreshing ? "POLLING SQL..." : "REFRESH LOGS"}
                </button>
            </div>

            <div className="events-table-wrapper">
                {isRefreshing && events.length === 0 ? (
                    <div style={{ padding: '20px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        QUERYING TELEMETRY SQL SECURE JOURNAL...
                    </div>
                ) : (
                    <table className="events-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>TIMESTAMP</th>
                                <th>EVENT TYPE</th>
                                <th>SOURCE</th>
                                <th>RISK LEVEL</th>
                                <th>CONFIDENCE</th>
                                <th>MESSAGE</th>
                                <th>MEDIA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentEvents.map((event) => (
                                <tr key={event.id} onClick={() => setSelectedEvent(event)}>
                                    <td>#{event.id}</td>
                                    <td>{formatTime(event.created_at)}</td>
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
                                    <td>
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

            {/* Pagination Controls */}
            {events.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                    <button
                        className="btn-tech-action"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        style={{ marginTop: 0 }}
                    >
                        &larr; PREV
                    </button>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        PAGE {currentPage} OF {totalPages || 1}
                    </span>
                    <button
                        className="btn-tech-action"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        style={{ marginTop: 0 }}
                    >
                        NEXT &rarr;
                    </button>
                </div>
            )}

            {/* View Snapshot Modal */}
            {selectedEvent && (
                <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
                    <div
                        className={`modal-content-card ${selectedEvent.risk_level === 'EMERGENCY' || selectedEvent.risk_level === 'CRITICAL' || selectedEvent.risk_level === 'HIGH' ? 'alert-border' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h4 className="modal-title">
                                EVENT DETAILED SCOPE JOURNAL [#{selectedEvent.id}]
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
                                    />
                                </div>
                            ) : (
                                <div className="modal-image-wrapper" style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                    NO RECORDED IMAGE SNAPSHOT IN SQL DATABASE FILE
                                </div>
                            )}

                            <div className="modal-data-table">
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
