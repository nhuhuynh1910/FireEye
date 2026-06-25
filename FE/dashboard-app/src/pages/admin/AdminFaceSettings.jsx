/* pages/admin/AdminFaceSettings.jsx */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api, API_BASE_URL } from '../../services/api';
import { useSystem } from '../../store/SystemContext';

export const AdminFaceSettings = () => {
    const { faceWatchActive, toggleFaceWatch } = useSystem();

    // Registry form
    const [regName, setRegName] = useState("");
    const [regRole, setRegRole] = useState("Operator");
    const [regFile, setRegFile] = useState(null);
    const [regStatus, setRegStatus] = useState({ success: null, message: "" });
    const [isRegistering, setIsRegistering] = useState(false);
    
    // People list
    const [people, setPeople] = useState([]);
    const [isLoadingPeople, setIsLoadingPeople] = useState(false);

    const fileInputRef = useRef(null);

    const fetchPeople = useCallback(async () => {
        setIsLoadingPeople(true);
        try {
            const res = await api.getPeople();
            if (res.success) {
                setPeople(res.data);
            }
        } catch (err) {
            console.error("Failed to load registered people:", err);
        } finally {
            setIsLoadingPeople(false);
        }
    }, []);

    useEffect(() => {
        fetchPeople();
    }, [fetchPeople]);

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        if (!regName || !regFile) {
            setRegStatus({ success: false, message: "Please input employee name and select a portrait image." });
            return;
        }
        setIsRegistering(true);
        setRegStatus({ success: null, message: "" });

        try {
            const res = await api.registerFace(regName, regRole, regFile);
            if (res.success) {
                setRegStatus({ success: true, message: "Employee face registered successfully!" });
                setRegName("");
                setRegFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                fetchPeople();
            } else {
                setRegStatus({ success: false, message: res.message || "Failed to commit record." });
            }
        } catch (err) {
            setRegStatus({ success: false, message: "Network connection error to FastAPI backend." });
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <div className="admin-view-panel">
            <div className="admin-view-header">
                <h2>FACIAL RECOGNITION DATABASE & WORKER</h2>
                <p>Register authorized personnel and toggle real-time camera face match monitoring</p>
            </div>

            <div className="admin-grid-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px', marginTop: '16px' }}>
                
                {/* Left Side: Worker Service & Registration form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Real-time Watcher Service Controller */}
                    <div className="admin-config-card">
                        <h3 className="section-title">REAL-TIME AUTO WATCHER SERVICE</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-deep)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', margin: '12px 0' }}>
                            <div>
                                <span style={{ fontWeight: 'bold', fontSize: '12px' }}>SERVICE TELEMETRY PIPELINE</span>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Scan camera frames every 3s for matching profiles</div>
                            </div>
                            <span className={`status-dot-badge ${faceWatchActive ? 'online' : 'offline'}`}>
                                {faceWatchActive ? 'RUNNING' : 'STOPPED'}
                            </span>
                        </div>
                        <button
                            type="button"
                            className={`btn-tech-action ${faceWatchActive ? 'danger' : 'primary'}`}
                            onClick={toggleFaceWatch}
                            style={{ width: '100%', marginTop: '6px' }}
                        >
                            {faceWatchActive ? 'DEACTIVATE FACE MONITORING' : 'ACTIVATE FACE MONITORING'}
                        </button>
                    </div>

                    {/* Registration Form */}
                    <div className="admin-config-card">
                        <h3 className="section-title">AUTHORIZE NEW PERSONNEL</h3>
                        <form onSubmit={handleRegisterSubmit} style={{ marginTop: '12px' }}>
                            <div className="input-group-glow">
                                <label htmlFor="reg-name">FULL NAME</label>
                                <input
                                    type="text"
                                    id="reg-name"
                                    placeholder="Enter employee/guest name..."
                                    value={regName}
                                    onChange={(e) => setRegName(e.target.value)}
                                    disabled={isRegistering}
                                    required
                                />
                            </div>

                            <div className="input-group-glow">
                                <label htmlFor="reg-role">ORGANIZATIONAL ROLE</label>
                                <select
                                    id="reg-role"
                                    value={regRole}
                                    onChange={(e) => setRegRole(e.target.value)}
                                    disabled={isRegistering}
                                    style={{ width: '100%', padding: '10px', background: 'var(--bg-deep)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                >
                                    <option value="Operator">Operator</option>
                                    <option value="Security Officer">Security Officer</option>
                                    <option value="Plant Supervisor">Plant Supervisor</option>
                                    <option value="Guest Visitor">Guest Visitor</option>
                                </select>
                            </div>

                            <div className="input-group-glow" style={{ marginTop: '16px' }}>
                                <label>PORTRAIT SNAPSHOT FILE</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={(e) => setRegFile(e.target.files[0])}
                                    style={{ display: 'none' }}
                                />
                                <div
                                    className="file-upload-drag"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ padding: '20px', border: '1px dashed var(--border-color)', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', background: 'rgba(6,10,19,0.3)' }}
                                >
                                    <span style={{ display: 'block', marginBottom: '8px', color: 'var(--accent-cyan)' }}>
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
                                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                                        </svg>
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        {regFile ? regFile.name : "Select or Drop Image File"}
                                    </span>
                                </div>
                            </div>

                            {regStatus.message && (
                                <div style={{
                                    padding: '8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    margin: '12px 0 0 0',
                                    fontFamily: 'monospace',
                                    backgroundColor: regStatus.success ? 'rgba(255, 94, 54, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                                    border: `1px solid ${regStatus.success ? 'var(--accent-cyan)' : 'var(--accent-red)'}`,
                                    color: regStatus.success ? 'var(--accent-cyan)' : 'var(--accent-red)'
                                }}>
                                    {regStatus.message}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn-tech-action primary"
                                disabled={isRegistering}
                                style={{ width: '100%', marginTop: '20px' }}
                            >
                                {isRegistering ? "SAVING RECORD..." : "COMMIT REGISTRATION"}
                            </button>
                        </form>
                    </div>

                </div>

                {/* Right Side: Roster Database List */}
                <div className="admin-config-card">
                    <h3 className="section-title">AUTHORIZED REGISTERED ROSTER ({people.length})</h3>
                    
                    {isLoadingPeople ? (
                        <div style={{ padding: '20px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                            QUERYING FACIAL DATABASE ENCRYPTED ROSTER...
                        </div>
                    ) : (
                        <div className="faces-registry-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '16px', maxHeight: '550px', overflowY: 'auto' }}>
                            {people.map((person) => (
                                <div key={person.id} className="user-node-hex" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-deep)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
                                    <div className="hex-avatar-container" style={{ width: '64px', height: '64px', overflow: 'hidden', borderRadius: '50%', border: '2px solid var(--accent-cyan)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '8px' }}>
                                        {person.avatar_path ? (
                                            <img src={`${API_BASE_URL}${person.avatar_path}`} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                                                {person.name.substring(0, 2).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center', color: '#fff' }} title={person.name}>{person.name}</span>
                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{person.role}</span>
                                </div>
                            ))}
                            {people.length === 0 && (
                                <div style={{ gridColumn: 'span 2', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', padding: '40px 0' }}>
                                    Facial database roster is empty. Register personnel.
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
