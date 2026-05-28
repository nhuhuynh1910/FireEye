/* pages/FaceDatabase.jsx */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

const API_BASE_URL = typeof window !== 'undefined' 
    ? `http://${window.location.hostname}:8000` 
    : "http://127.0.0.1:8000";

export const FaceDatabase = () => {
    // Registry form
    const [regName, setRegName] = useState("");
    const [regRole, setRegRole] = useState("Operator");
    const [regFile, setRegFile] = useState(null);
    const [regStatus, setRegStatus] = useState({ success: null, message: "" });
    const [isRegistering, setIsRegistering] = useState(false);
    
    // Verification state
    const [verResult, setVerResult] = useState(null);
    const [verFile, setVerFile] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    
    // People list
    const [people, setPeople] = useState([]);
    const [isLoadingPeople, setIsLoadingPeople] = useState(false);

    const fileInputRef = useRef(null);
    const verInputRef = useRef(null);

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
            setRegStatus({ success: false, message: "Vui lòng nhập tên và chọn ảnh." });
            return;
        }
        setIsRegistering(true);
        setRegStatus({ success: null, message: "" });

        try {
            const res = await api.registerFace(regName, regRole, regFile);
            if (res.success) {
                setRegStatus({ success: true, message: "Đăng ký gương mặt thành công!" });
                setRegName("");
                setRegFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                fetchPeople();
            } else {
                setRegStatus({ success: false, message: res.message || "Đăng ký thất bại." });
            }
        } catch (err) {
            setRegStatus({ success: false, message: "Lỗi kết nối tới backend." });
        } finally {
            setIsRegistering(false);
        }
    };

    const handleCameraVerify = async () => {
        setIsVerifying(true);
        setVerResult(null);
        try {
            const res = await api.matchCameraFace();
            if (res.success) {
                setVerResult(res);
            } else {
                alert(res.message || "Không thể thực hiện đối khớp qua camera.");
            }
        } catch (err) {
            alert("Lỗi kết nối tới backend.");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleFileVerify = async (file) => {
        if (!file) return;
        setIsVerifying(true);
        setVerResult(null);
        try {
            const res = await api.matchFaceImage(file);
            if (res.success) {
                setVerResult(res);
            } else {
                alert(res.message || "Không tìm thấy gương mặt.");
            }
        } catch (err) {
            alert("Lỗi kết nối tới backend.");
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="face-db-grid">
            {/* Left Module: Verification and Registry Forms */}
            <div className="face-db-card">
                <h3 className="face-db-title">FACE VERIFICATION HUD</h3>

                {/* Camera Match Trigger */}
                <div className="face-verification-box">
                    <button
                        className="btn-tech-action primary"
                        onClick={handleCameraVerify}
                        disabled={isVerifying}
                    >
                        {isVerifying ? "SCANNING LIVE FEED..." : "SCAN DAHUA CAMERA"}
                    </button>
                    
                    <div style={{ textAlign: 'center', margin: '6px 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                        OR UPLOAD SNAPSHOT
                    </div>

                    <input
                        type="file"
                        accept="image/*"
                        ref={verInputRef}
                        onChange={(e) => handleFileVerify(e.target.files[0])}
                        style={{ display: 'none' }}
                    />
                    
                    <button
                        className="btn-tech-action"
                        onClick={() => verInputRef.current?.click()}
                        disabled={isVerifying}
                    >
                        UPLOAD SCAN FILE
                    </button>
                </div>

                {/* Match Results View */}
                {verResult && (
                    <div className="face-verification-box" style={{ border: '1px solid var(--accent-cyan)' }}>
                        <h4 style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>
                            VERIFICATION RESULTS ({verResult.faces_detected} DETECTED)
                        </h4>
                        
                        {verResult.snapshot && (
                            <div className="verification-photo-pane">
                                <img src={`${API_BASE_URL}${verResult.snapshot}`} alt="Face Verification Scan" />
                                {isVerifying && <div className="face-scanning-line"></div>}
                                
                                {/* Overlay bounding boxes from results */}
                                {verResult.results.map((face, index) => {
                                    if (!face.bbox) return null;
                                    // Scale coordinates from raw Dahua to responsive container if needed,
                                    // here we draw them relative if image is exact size, or draw absolute based on coords
                                    const [x1, y1, x2, y2] = face.bbox;
                                    return (
                                        <div
                                            key={index}
                                            style={{
                                                position: 'absolute',
                                                border: `2px solid ${face.matched ? 'var(--accent-cyan)' : 'var(--accent-red)'}`,
                                                // Assuming simple responsive percentage layout mapping for demonstration
                                                left: `${x1 / 9.6}%`,
                                                top: `${y1 / 5.4}%`,
                                                width: `${(x2 - x1) / 9.6}%`,
                                                height: `${(y2 - y1) / 5.4}%`,
                                                pointerEvents: 'none'
                                            }}
                                        >
                                            <span style={{
                                                position: 'absolute',
                                                top: '-18px',
                                                left: '-2px',
                                                background: face.matched ? 'var(--accent-cyan)' : 'var(--accent-red)',
                                                color: '#000',
                                                fontWeight: '800',
                                                fontSize: '8px',
                                                fontFamily: 'monospace',
                                                padding: '1px 4px',
                                                borderRadius: '2px',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {face.name} {(face.confidence * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {verResult.results.map((face, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontFamily: 'monospace',
                                        fontSize: '11px',
                                        background: 'rgba(6,10,19,0.5)',
                                        padding: '6px',
                                        borderRadius: '4px',
                                        borderLeft: `3px solid ${face.matched ? 'var(--accent-cyan)' : 'var(--accent-red)'}`
                                    }}
                                >
                                    <span>{face.name} ({face.role || 'N/A'})</span>
                                    <span style={{ color: face.matched ? 'var(--accent-cyan)' : 'var(--accent-red)' }}>
                                        {face.matched ? 'AUTHORIZED' : 'UNKNOWN'} ({(face.confidence * 100).toFixed(0)}%)
                                    </span>
                                </div>
                            ))}
                            {verResult.results.length === 0 && (
                                <div style={{ fontSize: '11px', color: 'var(--accent-red)', fontFamily: 'monospace' }}>
                                    NO FACES DETECTED IN CAMERA SCOPE
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Face Registration form */}
                <form onSubmit={handleRegisterSubmit} style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <h4 style={{ fontSize: '12px', color: '#ffffff', fontWeight: '700', textTransform: 'uppercase', marginBottom: '12px' }}>
                        REGISTER AUTHORIZED PERSONNEL
                    </h4>

                    <div className="input-group">
                        <label htmlFor="reg-name">NAME</label>
                        <input
                            type="text"
                            id="reg-name"
                            placeholder="Type employee/guest name..."
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            disabled={isRegistering}
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="reg-role">ROLE</label>
                        <select
                            id="reg-role"
                            value={regRole}
                            onChange={(e) => setRegRole(e.target.value)}
                            disabled={isRegistering}
                        >
                            <option value="Operator">Operator</option>
                            <option value="Security Officer">Security Officer</option>
                            <option value="Plant Supervisor">Plant Supervisor</option>
                            <option value="Guest Visitor">Guest Visitor</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label>PORTRAIT PHOTO</label>
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
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                            </svg>
                            <span>{regFile ? regFile.name : "Select or Drop Image File"}</span>
                        </div>
                    </div>

                    {regStatus.message && (
                        <div style={{
                            padding: '8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            marginBottom: '10px',
                            fontFamily: 'monospace',
                            backgroundColor: regStatus.success ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 59, 48, 0.1)',
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
                        style={{ width: '100%' }}
                    >
                        {isRegistering ? "SAVING RECORD..." : "COMMIT REGISTRATION"}
                    </button>
                </form>
            </div>

            {/* Right Module: Personnel Roster (Registered database list) */}
            <div className="face-db-card">
                <h3 className="face-db-title">REGISTERED PERSONNEL DATABASE</h3>
                
                {isLoadingPeople ? (
                    <div style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        QUERYING SQL SECURE ROSTER...
                    </div>
                ) : (
                    <div className="faces-registry-list">
                        {people.map((person) => (
                            <div key={person.id} className="user-node-hex">
                                <div className="hex-avatar-container">
                                    {person.avatar_path ? (
                                        <img src={`${API_BASE_URL}${person.avatar_path}`} alt={person.name} />
                                    ) : (
                                        <div className="hex-avatar-fallback">
                                            {person.name.substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <span className="user-node-name" title={person.name}>{person.name}</span>
                                <span className="user-node-role">{person.role}</span>
                            </div>
                        ))}
                        {people.length === 0 && (
                            <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', gridColumn: 'span 2', fontSize: '12px' }}>
                                Roster empty. Register personnel using the verification panel.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
