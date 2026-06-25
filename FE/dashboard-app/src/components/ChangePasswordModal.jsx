import React, { useState } from 'react';
import { api } from '../services/api';

export const ChangePasswordModal = ({ onClose }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const validatePassword = (pwd) => {
        if (pwd.length < 8) {
            return "Password must be at least 8 characters long.";
        }
        if (!/[A-Z]/.test(pwd)) {
            return "Password must contain at least one uppercase letter (A-Z).";
        }
        if (!/[a-z]/.test(pwd)) {
            return "Password must contain at least one lowercase letter (a-z).";
        }
        if (!/\d/.test(pwd)) {
            return "Password must contain at least one digit (0-9).";
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
            return "Password must contain at least one special character (e.g. !@#$%^&*).";
        }
        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Client-side strength check
        const strengthError = validatePassword(newPassword);
        if (strengthError) {
            setError(strengthError);
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
                setSuccess('Password changed successfully!');
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                setError(res.message || 'An error occurred while changing the password.');
            }
        } catch (err) {
            setError(err.message || 'An error occurred while changing the password.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-backdrop-glow">
            <div className="modal-content-glass">
                <header className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                    <h2>CHANGE PASSWORD</h2>
                    <button className="btn-close-modal" onClick={onClose} disabled={submitting}>&times;</button>
                </header>

                <form onSubmit={handleSubmit} className="modal-form">
                    {error && (
                        <div className="modal-error-alert" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                    <line x1="12" y1="9" x2="12" y2="13"/>
                                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                            </span>
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="modal-error-alert" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#a7f3d0' }}>
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            </span>
                            <span>{success}</span>
                        </div>
                    )}

                    <div className="form-group-glow">
                        <label htmlFor="modal-old-password">CURRENT PASSWORD</label>
                        <input
                            id="modal-old-password"
                            type="password"
                            placeholder="Enter current password..."
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            disabled={submitting}
                            required
                        />
                    </div>

                    <div className="form-group-glow">
                        <label htmlFor="modal-new-password">NEW PASSWORD</label>
                        <input
                            id="modal-new-password"
                            type="password"
                            placeholder="Minimum 8 characters, with uppercase, lowercase, number & special char..."
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={submitting}
                            required
                        />
                    </div>

                    <div className="form-group-glow">
                        <label htmlFor="modal-confirm-password">CONFIRM NEW PASSWORD</label>
                        <input
                            id="modal-confirm-password"
                            type="password"
                            placeholder="Re-enter new password..."
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={submitting}
                            required
                        />
                    </div>

                    <div className="modal-actions">
                        <button 
                            type="button" 
                            className="btn-modal btn-modal-cancel" 
                            onClick={onClose} 
                            disabled={submitting}
                        >
                            CANCEL
                        </button>
                        <button 
                            type="submit" 
                            className="btn-modal btn-modal-submit"
                            disabled={submitting}
                        >
                            {submitting ? 'SAVING...' : 'UPDATE'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
