import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/image-removebg-preview.jpg';

export const Login = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!username.trim() || !password.trim()) {
            setError('Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.');
            return;
        }

        setSubmitting(true);
        try {
            await login(username, password);
        } catch (err) {
            setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.');
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
                    <p className="login-subtitle">Hệ thống giám sát phòng cháy chữa cháy thông minh</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="login-error-alert">
                            <span className="error-icon">⚠️</span>
                            <span className="error-text">{error}</span>
                        </div>
                    )}

                    <div className="input-group-glow">
                        <label htmlFor="username">TÊN ĐĂNG NHẬP</label>
                        <div className="input-with-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <input
                                id="username"
                                type="text"
                                placeholder="Nhập tên đăng nhập..."
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={submitting}
                                autoComplete="username"
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group-glow">
                        <label htmlFor="password">MẬT KHẨU</label>
                        <div className="input-with-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            <input
                                id="password"
                                type="password"
                                placeholder="Nhập mật khẩu..."
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={submitting}
                                autoComplete="current-password"
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className={`btn-login-glow ${submitting ? 'loading' : ''}`}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <span className="spinner"></span>
                        ) : 'ĐĂNG NHẬP HỆ THỐNG'}
                    </button>
                </form>

                <div className="login-footer">
                    <span>Mức độ bảo mật tối cao • Raspberry Pi 5 + Hailo 8L</span>
                </div>
            </div>
        </div>
    );
};
