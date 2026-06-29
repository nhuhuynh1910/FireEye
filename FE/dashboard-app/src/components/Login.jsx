import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/image-removebg-preview.jpg';

export const Login = () => {
    const { login } = useAuth();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [systemSecretKey, setSystemSecretKey] = useState('');
    const [showSecretKey, setShowSecretKey] = useState(false);
    const [showSystemSecretKey, setShowSystemSecretKey] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!phoneNumber.trim() || !secretKey.trim() || !systemSecretKey.trim()) {
            setError('Please enter phone number, secret key and system key.');
            return;
        }

        setSubmitting(true);
        try {
            await login(phoneNumber, secretKey, systemSecretKey);
        } catch (err) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="login-screen-container">
            <div className="glow-sphere-1"></div>
            <div className="glow-sphere-2"></div>
            
            <div className="login-glass-card">
                <div className="login-header">
                    <img src={logoImg} alt="FireEye Logo" className="login-logo-glow" />
                    <h1 className="login-title">FIREEYE SYSTEM</h1>
                    <p className="login-subtitle">Smart Fire Monitoring and Alarm System</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="login-error-alert" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="error-icon" style={{ display: 'flex', alignItems: 'center' }}>
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                    <line x1="12" y1="9" x2="12" y2="13"/>
                                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                            </span>
                            <span className="error-text">{error}</span>
                        </div>
                    )}

                    <div className="input-group-glow">
                        <label htmlFor="phoneNumber">PHONE NUMBER</label>
                        <div className="input-with-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            <input
                                id="phoneNumber"
                                type="tel"
                                placeholder="Enter phone number..."
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                disabled={submitting}
                                autoComplete="tel"
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group-glow">
                        <label htmlFor="secretKey">SECRET KEY</label>
                        <div className="input-with-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            <input
                                id="secretKey"
                                type={showSecretKey ? 'text' : 'password'}
                                placeholder="Enter secret key..."
                                value={secretKey}
                                onChange={(e) => setSecretKey(e.target.value)}
                                disabled={submitting}
                                autoComplete="current-password"
                                required
                                style={{ paddingRight: '42px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowSecretKey(!showSecretKey)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {showSecretKey ? (
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="input-group-glow">
                        <label htmlFor="systemSecretKey">SYSTEM SECRET KEY</label>
                        <div className="input-with-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon">
                                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                                <line x1="6" y1="6" x2="6.01" y2="6"></line>
                                <line x1="6" y1="18" x2="6.01" y2="18"></line>
                            </svg>
                            <input
                                id="systemSecretKey"
                                type={showSystemSecretKey ? 'text' : 'password'}
                                placeholder="Enter server system key..."
                                value={systemSecretKey}
                                onChange={(e) => setSystemSecretKey(e.target.value)}
                                disabled={submitting}
                                required
                                style={{ paddingRight: '42px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowSystemSecretKey(!showSystemSecretKey)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {showSystemSecretKey ? (
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className={`btn-login-glow ${submitting ? 'loading' : ''}`}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <span className="spinner"></span>
                        ) : 'LOGIN SYSTEM'}
                    </button>
                </form>

                <div className="login-footer">
                    <span>Maximum Security Level • Raspberry Pi 5 + Hailo 8L</span>
                </div>
            </div>
        </div>
    );
};
