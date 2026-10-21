/* pages/admin/AdminSystemLogs.jsx */
import React, { useState, useEffect, useCallback } from 'react';
import { api, API_BASE_URL } from '../../services/api';
import { useSystem } from '../../store/SystemContext';

export const AdminSystemLogs = () => {
    const { events, fetchEvents } = useSystem();
    const [activeSubTab, setActiveSubTab] = useState('threats'); // 'threats' | 'audit'

    // Refresh states
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Audit logs states
    const [auditLogs, setAuditLogs] = useState([]);
    const [isLoadingAudit, setIsLoadingAudit] = useState(false);

    // Pagination states
    const [threatPage, setThreatPage] = useState(1);
    const [auditPage, setAuditPage] = useState(1);
    const itemsPerPage = 10;

    // Threat Modal selection
    const [selectedEvent, setSelectedEvent] = useState(null);

    const fetchAudit = useCallback(async () => {
        setIsLoadingAudit(true);
        try {
            const res = await api.getAuditLogs(100);
            const logsData = Array.isArray(res) ? res : (res?.data || []);
            setAuditLogs(logsData);
        } catch (err) {
            console.error("Failed to load audit logs:", err);
        } finally {
            setIsLoadingAudit(false);
        }
    }, []);

    // Initial load and tab change trigger
    useEffect(() => {
        if (activeSubTab === 'audit') {
            fetchAudit();
        }
    }, [activeSubTab, fetchAudit]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            if (activeSubTab === 'threats') {
                await fetchEvents(100);
                setThreatPage(1);
            } else {
                await fetchAudit();
                setAuditPage(1);
            }
        } finally {
            setIsRefreshing(false);
        }
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return "";
        return timeStr.replace('T', ' ').substring(0, 19);
    };

    // Calculate pagination for threats
    const totalThreatPages = Math.ceil(events.length / itemsPerPage);
    const currentThreats = events.slice((threatPage - 1) * itemsPerPage, threatPage * itemsPerPage);

    // Calculate pagination for audit logs
    const totalAuditPages = Math.ceil(auditLogs.length / itemsPerPage);
    const currentAudits = auditLogs.slice((auditPage - 1) * itemsPerPage, auditPage * itemsPerPage);

    return (
        <div className="admin-view-panel">
            <div className="admin-view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <h2>SYSTEM LOGS JOURNAL</h2>
                    <p>Chronological alerts, AI threat logs, and administrator security audit actions</p>
                </div>
                <button 
                    className="btn-tech-action" 
                    onClick={handleRefresh} 
                    disabled={isRefreshing || isLoadingAudit} 
                    style={{ marginTop: 0 }}
                >
                    {isRefreshing || isLoadingAudit ? "POLLING SQL..." : "REFRESH CURRENT LOGS"}
                </button>
            </div>

            {/* Sub-tab selection */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <button
                    type="button"
                    className={`btn-tech-action ${activeSubTab === 'threats' ? 'primary' : ''}`}
                    onClick={() => setActiveSubTab('threats')}
                    style={{ flexGrow: 1, marginTop: 0 }}
                >
                    THREAT & EVENT LOGS
                </button>
                <button
                    type="button"
                    className={`btn-tech-action ${activeSubTab === 'audit' ? 'primary' : ''}`}
                    onClick={() => setActiveSubTab('audit')}
                    style={{ flexGrow: 1, marginTop: 0 }}
                >
                    SECURITY AUDIT LOGS
                </button>
            </div>

            <div className="admin-card-section" style={{ minHeight: '400px' }}>
                {activeSubTab === 'threats' ? (
                    <div className="services-status-table-wrapper">
                        {isRefreshing && events.length === 0 ? (
                            <div style={{ padding: '20px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                QUERYING TELEMETRY SQL SECURE JOURNAL...
                            </div>
                        ) : (
                            <>
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
                                        {currentThreats.map((event) => (
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

                                {/* Threats Pagination */}
                                {events.length > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                                        <button
                                            className="btn-tech-action"
                                            onClick={() => setThreatPage(prev => Math.max(prev - 1, 1))}
                                            disabled={threatPage === 1}
                                            style={{ marginTop: 0 }}
                                        >
                                            &larr; PREV
                                        </button>
                                        <span style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            PAGE {threatPage} OF {totalThreatPages || 1}
                                        </span>
                                        <button
                                            className="btn-tech-action"
                                            onClick={() => setThreatPage(prev => Math.min(prev + 1, totalThreatPages))}
                                            disabled={threatPage === totalThreatPages || totalThreatPages === 0}
                                            style={{ marginTop: 0 }}
                                        >
                                            NEXT &rarr;
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="services-status-table-wrapper">
                        {isLoadingAudit && auditLogs.length === 0 ? (
                            <div style={{ padding: '20px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                QUERYING SYSTEM SECURITY AUDIT SQL DATABASE...
                            </div>
                        ) : (
                            <>
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>TIMESTAMP</th>
                                            <th>OPERATOR USER</th>
                                            <th>ACTION PERFORMED</th>
                                            <th>TARGET TARGET</th>
                                            <th>TRANSACTIONS DETAILS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentAudits.map((log) => (
                                            <tr key={log.id}>
                                                <td>#{log.id}</td>
                                                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{formatTime(log.created_at)}</td>
                                                <td style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                                                    {log.full_name || log.username || `User #${log.user_id}`}
                                                </td>
                                                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{log.action}</td>
                                                <td>
                                                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                        {log.target_device || 'SYSTEM'}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '12px' }}>{log.details}</td>
                                            </tr>
                                        ))}
                                        {auditLogs.length === 0 && (
                                            <tr>
                                                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                                                    No audit security operations recorded in database yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                {/* Audit Pagination */}
                                {auditLogs.length > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                                        <button
                                            className="btn-tech-action"
                                            onClick={() => setAuditPage(prev => Math.max(prev - 1, 1))}
                                            disabled={auditPage === 1}
                                            style={{ marginTop: 0 }}
                                        >
                                            &larr; PREV
                                        </button>
                                        <span style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            PAGE {auditPage} OF {totalAuditPages || 1}
                                        </span>
                                        <button
                                            className="btn-tech-action"
                                            onClick={() => setAuditPage(prev => Math.min(prev + 1, totalAuditPages))}
                                            disabled={auditPage === totalAuditPages || totalAuditPages === 0}
                                            style={{ marginTop: 0 }}
                                        >
                                            NEXT &rarr;
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* View Threat Snapshot Modal */}
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
