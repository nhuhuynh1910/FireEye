import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import logoImg from '../assets/image-removebg-preview.jpg';

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
            setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu mới và mật khẩu xác nhận không trùng khớp.');
            return;
        }

        if (newPassword === oldPassword) {
            setError('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.changePassword(oldPassword, newPassword);
            if (res && res.success) {
                setSuccess('Đổi mật khẩu thành công! Đang truy cập hệ thống...');
                setTimeout(() => {
                    updateFirstLoginFlag();
                }, 1500);
            }
        } catch (err) {
            setError(err.message || 'Có lỗi xảy ra khi đổi mật khẩu.');
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
                    <h1 className="login-title">ĐỔI MẬT KHẨU MẶC ĐỊNH</h1>
                    <p className="login-subtitle">Để đảm bảo an toàn hệ thống IoT, bạn bắt buộc phải đổi mật khẩu mặc định trong lần đăng nhập đầu tiên.</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="login-error-alert">
                            <span className="error-icon">⚠️</span>
                            <span className="error-text">{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="login-success-alert">
                            <span className="success-icon">✅</span>
                            <span className="success-text">{success}</span>
                        </div>
                    )}

                    <div className="input-group-glow">
                        <label htmlFor="old-password">MẬT KHẨU HIỆN TẠI (MẶC ĐỊNH)</label>
                        <input
                            id="old-password"
                            type="password"
                            placeholder="Nhập mật khẩu hiện tại..."
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            disabled={submitting}
                            required
                        />
                    </div>

                    <div className="input-group-glow">
                        <label htmlFor="new-password">MẬT KHẨU MỚI</label>
                        <input
                            id="new-password"
                            type="password"
                            placeholder="Tối thiểu 6 ký tự..."
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={submitting}
                            required
                        />
                    </div>

                    <div className="input-group-glow">
                        <label htmlFor="confirm-password">XÁC NHẬN MẬT KHẨU MỚI</label>
                        <input
                            id="confirm-password"
                            type="password"
                            placeholder="Nhập lại mật khẩu mới..."
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
                            Đăng xuất
                        </button>
                        
                        <button 
                            type="submit" 
                            className={`btn-change-password-glow ${submitting ? 'loading' : ''}`}
                            disabled={submitting}
                        >
                            {submitting ? <span className="spinner"></span> : 'XÁC NHẬN ĐỔI MẬT KHẨU'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
