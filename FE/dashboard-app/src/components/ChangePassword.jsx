import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import logoImg from '../assets/logo.jpg';

export const ChangePassword = () => {
    const { logout, updateFirstLoginFlag } = useAuth();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword.length < 6) {
            setError('New password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New password and confirm password do not match.');
            return;
        }

        if (newPassword === oldPassword) {
            setError('New password cannot be the same as the current password.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.changePassword(oldPassword, newPassword);
            if (res && res.success) {
                setSuccess('Password changed successfully! Accessing system...');
                setTimeout(() => {
                    updateFirstLoginFlag();
                }, 1500);
            }
        } catch (err) {
            setError(err.message || 'An error occurred while changing password.');
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
                    <h1 className="login-title">CHANGE DEFAULT PASSWORD</h1>
                    <p className="login-subtitle">To ensure system security, you are required to change the default password on your first login.</p>
                </div>
 
                <form onSubmit={handleSubmit} className="login-form">
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
 
                        <div className="login-success-alert" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="success-icon" style={{ display: 'flex', alignItems: 'center' }}>
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            </span>
                            <span className="success-text">{success}</span>
                        </div>
 
                    <div className="input-group-glow">
                        <label htmlFor="old-password">CURRENT PASSWORD (DEFAULT)</label>
                        <input
                            id="old-password"
                            type="password"
                            placeholder="Enter current password..."
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            disabled={submitting}
                            required
                        />
                    </div>
 
                    <div className="input-group-glow">
                        <label htmlFor="new-password">NEW PASSWORD</label>
                        <input
                            id="new-password"
                            type="password"
                            placeholder="Minimum 6 characters..."
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={submitting}
                            required
                        />
                    </div>
 
                    <div className="input-group-glow">
                        <label htmlFor="confirm-password">CONFIRM NEW PASSWORD</label>
                        <input
                            id="confirm-password"
                            type="password"
                            placeholder="Re-enter new password..."
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={submitting}
                            required
                        />
                    </div>
 
                    <div className="actions-row">
                        <button 
                            type="button" 
                            className="btn-cancel-logout"
                            onClick={logout}
                            disabled={submitting}
                        >
                            Logout
                        </button>
                        
                        <button 
                            type="submit" 
                            className={`btn-change-password-glow ${submitting ? 'loading' : ''}`}
                            disabled={submitting}
                        >
                            {submitting ? <span className="spinner"></span> : 'CONFIRM PASSWORD CHANGE'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
