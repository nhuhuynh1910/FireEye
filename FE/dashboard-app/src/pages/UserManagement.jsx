import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
    const [selectedUserId, setSelectedUserId] = useState(null);

    // Form inputs
    const [formUsername, setFormUsername] = useState('');
    const [formPassword, setFormPassword] = useState('');
    const [formFullName, setFormFullName] = useState('');
    const [formRole, setFormRole] = useState('STAFF');
    const [formSubmitting, setFormSubmitting] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch (err) {
            setError(err.message || 'Không thể tải danh sách người dùng.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser && currentUser.role === 'ADMIN') {
            loadUsers();
        }
    }, [currentUser]);

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedUserId(null);
        setFormUsername('');
        setFormPassword('');
        setFormFullName('');
        setFormRole('STAFF');
        setError('');
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setModalMode('edit');
        setSelectedUserId(user.id);
        setFormUsername(user.username);
        setFormPassword(''); // blank unless changing
        setFormFullName(user.full_name || '');
        setFormRole(user.role);
        setError('');
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (modalMode === 'create' && (!formUsername.trim() || !formPassword.trim())) {
            setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
            return;
        }

        setFormSubmitting(true);
        try {
            if (modalMode === 'create') {
                await api.createUser(formUsername, formPassword, formFullName, formRole);
                setSuccess(`Đã tạo tài khoản "${formUsername}" thành công!`);
            } else {
                await api.updateUser(selectedUserId, formFullName, formRole, formPassword || null);
                setSuccess(`Đã cập nhật tài khoản "${formUsername}" thành công!`);
            }
            setIsModalOpen(false);
            loadUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Thao tác thất bại.');
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (userId === currentUser.id) {
            alert('Bạn không thể xóa tài khoản của chính mình.');
            return;
        }

        if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${username}" không? Hành động này không thể hoàn tác.`)) {
            return;
        }

        setError('');
        setSuccess('');
        try {
            await api.deleteUser(userId);
            setSuccess(`Đã xóa tài khoản "${username}" thành công.`);
            loadUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Không thể xóa người dùng.');
        }
    };

    if (currentUser.role !== 'ADMIN') {
        return (
            <div className="unauthorized-container">
                <div className="unauthorized-card">
                    <span className="shield-icon">🛡️</span>
                    <h2>Khu vực cấm truy cập</h2>
                    <p>Bạn không có quyền quản trị viên (ADMIN) để xem trang này.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="user-management-page">
            <div className="page-header-glow">
                <div>
                    <h1 className="page-title">Quản Lý Người Dùng</h1>
                    <p className="page-subtitle">Quản trị phân quyền tài khoản truy cập hệ thống FireEye Dashboard</p>
                </div>
                <button className="btn-add-user-glow" onClick={openCreateModal}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="plus-icon">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Tạo Người Dùng Mới
                </button>
            </div>

            {error && <div className="user-alert alert-error">{error}</div>}
            {success && <div className="user-alert alert-success">{success}</div>}

            <div className="table-glow-container">
                {loading ? (
                    <div className="table-loader">
                        <span className="spinner"></span>
                        <p>Đang tải danh sách người dùng...</p>
                    </div>
                ) : (
                    <table className="table-glow">
                        <thead>
                            <tr>
                                <th>TÊN ĐĂNG NHẬP</th>
                                <th>HỌ VÀ TÊN</th>
                                <th>VAI TRÒ</th>
                                <th>MẬT KHẨU MẶC ĐỊNH</th>
                                <th>NGÀY TẠO</th>
                                <th style={{ textAlign: 'right' }}>THAO TÁC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                        Không có người dùng nào.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => (
                                    <tr key={u.id} className={u.id === currentUser.id ? 'current-user-row' : ''}>
                                        <td>
                                            <span className="username-badge">{u.username}</span>
                                            {u.id === currentUser.id && <span className="self-tag">(Tài khoản của bạn)</span>}
                                        </td>
                                        <td>{u.full_name || '—'}</td>
                                        <td>
                                            <span className={`role-badge ${u.role?.toLowerCase()}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td>
                                            {u.is_first_login ? (
                                                <span className="first-login-yes">Yêu cầu đổi</span>
                                            ) : (
                                                <span className="first-login-no">Đã đổi</span>
                                            )}
                                        </td>
                                        <td className="date-cell">{u.created_at || '—'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                className="btn-action btn-edit" 
                                                onClick={() => openEditModal(u)}
                                                title="Sửa thông tin"
                                            >
                                                ✏️ Sửa
                                            </button>
                                            {u.id !== currentUser.id && (
                                                <button 
                                                    className="btn-action btn-delete" 
                                                    onClick={() => handleDeleteUser(u.id, u.username)}
                                                    title="Xóa người dùng"
                                                >
                                                    🗑️ Xóa
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* CREATE / EDIT MODAL */}
            {isModalOpen && (
                <div className="modal-backdrop-glow">
                    <div className="modal-content-glass">
                        <div className="modal-header">
                            <h2>{modalMode === 'create' ? 'TẠO TÀI KHOẢN MỚI' : 'SỬA THÔNG TIN TÀI KHOẢN'}</h2>
                            <button className="btn-close-modal" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="modal-form">
                            {error && <div className="modal-error-alert">{error}</div>}

                            <div className="form-group-glow">
                                <label>TÊN ĐĂNG NHẬP</label>
                                <input
                                    type="text"
                                    value={formUsername}
                                    onChange={(e) => setFormUsername(e.target.value)}
                                    disabled={modalMode === 'edit' || formSubmitting}
                                    placeholder="Ví dụ: staff1"
                                    required
                                />
                            </div>

                            <div className="form-group-glow">
                                <label>HỌ VÀ TÊN</label>
                                <input
                                    type="text"
                                    value={formFullName}
                                    onChange={(e) => setFormFullName(e.target.value)}
                                    disabled={formSubmitting}
                                    placeholder="Nhập họ và tên..."
                                />
                            </div>

                            <div className="form-group-glow">
                                <label>MẬT KHẨU {modalMode === 'edit' && '(Để trống nếu không đổi)'}</label>
                                <input
                                    type="password"
                                    value={formPassword}
                                    onChange={(e) => setFormPassword(e.target.value)}
                                    disabled={formSubmitting}
                                    placeholder={modalMode === 'create' ? "Nhập mật khẩu..." : "Nhập mật khẩu mới..."}
                                    required={modalMode === 'create'}
                                />
                            </div>

                            <div className="form-group-glow">
                                <label>VAI TRÒ</label>
                                <select
                                    value={formRole}
                                    onChange={(e) => setFormRole(e.target.value)}
                                    disabled={formSubmitting || (selectedUserId === currentUser.id)}
                                >
                                    <option value="STAFF">STAFF (Nhân viên trực ban)</option>
                                    <option value="ADMIN">ADMIN (Quản trị viên toàn hệ thống)</option>
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-modal btn-modal-cancel"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={formSubmitting}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn-modal btn-modal-submit"
                                    disabled={formSubmitting}
                                >
                                    {formSubmitting ? 'ĐANG LƯU...' : 'LƯU THAY ĐỔI'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
