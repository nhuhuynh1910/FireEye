/* pages/admin/AdminUserControl.jsx */
import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const AdminUserControl = () => {
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
    const [formIsActive, setFormIsActive] = useState(true);
    const [formSubmitting, setFormSubmitting] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch (err) {
            setError(err.message || 'Failed to query users database.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedUserId(null);
        setFormUsername('');
        setFormPassword('');
        setFormFullName('');
        setFormRole('STAFF');
        setFormIsActive(true);
        setError('');
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setModalMode('edit');
        setSelectedUserId(user.id);
        setFormUsername(user.username);
        setFormPassword('');
        setFormFullName(user.full_name || '');
        setFormRole(user.role);
        setFormIsActive(user.is_active);
        setError('');
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (modalMode === 'create' && (!formUsername.trim() || !formPassword.trim())) {
            setError('Please enter both username and password.');
            return;
        }

        if (formPassword) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?\":{}|<>])[A-Za-z\d!@#$%^&*(),.?\":{}|<>]{8,}$/;
            if (!passwordRegex.test(formPassword)) {
                setError('Password must be at least 8 characters long and contain uppercase, lowercase, number, and special characters.');
                return;
            }
        }

        setFormSubmitting(true);
        try {
            if (modalMode === 'create') {
                await api.createUser(formUsername, formPassword, formFullName, formRole);
                setSuccess(`User account "${formUsername}" created successfully!`);
            } else {
                await api.updateUser(selectedUserId, formFullName, formRole, formPassword || null, formIsActive);
                setSuccess(`User account "${formUsername}" updated successfully!`);
            }
            setIsModalOpen(false);
            loadUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Operation failed.');
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (userId === currentUser.id) {
            alert('Security constraint: You cannot delete your own active administrator account.');
            return;
        }

        if (!window.confirm(`Are you sure you want to permanently delete user "${username}"? This action is irreversible.`)) {
            return;
        }

        setError('');
        setSuccess('');
        try {
            await api.deleteUser(userId);
            setSuccess(`User account "${username}" deleted successfully.`);
            loadUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to delete user.');
        }
    };

    return (
        <div className="admin-view-panel">
            <div className="admin-view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>USER ROSTER & PRIVELEGES</h2>
                    <p>Manage authentication accounts and operational roles</p>
                </div>
                <button className="btn-tech-action primary" onClick={openCreateModal} style={{ marginTop: 0 }}>
                    + ADD NEW USER
                </button>
            </div>

            {error && <div className="admin-alert error">{error}</div>}
            {success && <div className="admin-alert success">{success}</div>}

            <div className="admin-card-section" style={{ marginTop: '16px' }}>
                {loading ? (
                    <div style={{ padding: '20px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        QUERYING SECURE USER RECORDS DATABASE...
                    </div>
                ) : (
                    <div className="services-status-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>USERNAME</th>
                                    <th>FULL NAME</th>
                                    <th>SECURITY ROLE</th>
                                    <th>STATUS</th>
                                    <th>DEFAULT PASSWORD</th>
                                    <th>CREATION TIME</th>
                                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id} className={u.id === currentUser.id ? 'active-row-highlight' : ''}>
                                        <td>
                                            <span style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{u.username}</span>
                                            {u.id === currentUser.id && <span style={{ fontSize: '9px', marginLeft: '6px', color: 'var(--text-muted)' }}>(YOU)</span>}
                                        </td>
                                        <td>{u.full_name || '—'}</td>
                                        <td>
                                            <span className={`role-badge ${u.role?.toLowerCase()}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                backgroundColor: u.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                color: u.is_active ? '#10b981' : '#ef4444',
                                                border: u.is_active ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)'
                                            }}>
                                                {u.is_active ? 'ACTIVE' : 'DISABLED'}
                                            </span>
                                        </td>
                                        <td>
                                            {u.is_first_login ? (
                                                <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>PENDING RESET</span>
                                            ) : (
                                                <span style={{ color: '#10b981' }}>CHANGED</span>
                                            )}
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{u.created_at || '—'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                className="btn-action-edit"
                                                onClick={() => openEditModal(u)}
                                                title="Edit User Info"
                                                style={{ marginRight: '8px' }}
                                            >
                                                EDIT
                                            </button>
                                            {u.id !== currentUser.id && (
                                                <button 
                                                    className="btn-action-delete"
                                                    onClick={() => handleDeleteUser(u.id, u.username)}
                                                    title="Delete User Account"
                                                >
                                                    DELETE
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* CREATE / EDIT MODAL */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content-card" onClick={(e) => e.stopPropagation()} style={{ width: '400px' }}>
                        <div className="modal-header">
                            <h4 className="modal-title">
                                {modalMode === 'create' ? 'CREATE SECURE ACCOUNT' : 'EDIT USER INFORMATION'}
                            </h4>
                            <button className="btn-modal-close" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleFormSubmit} className="login-form" style={{ padding: 0, background: 'none', border: 'none', boxShadow: 'none' }}>
                                <div className="input-group-glow">
                                    <label>USERNAME</label>
                                    <input
                                        type="text"
                                        value={formUsername}
                                        onChange={(e) => setFormUsername(e.target.value)}
                                        disabled={modalMode === 'edit' || formSubmitting}
                                        placeholder="Enter unique username..."
                                        required
                                    />
                                </div>

                                <div className="input-group-glow">
                                    <label>FULL NAME</label>
                                    <input
                                        type="text"
                                        value={formFullName}
                                        onChange={(e) => setFormFullName(e.target.value)}
                                        disabled={formSubmitting}
                                        placeholder="Enter user full name..."
                                    />
                                </div>

                                <div className="input-group-glow">
                                    <label>PASSWORD {modalMode === 'edit' && '(Leave blank to keep current)'}</label>
                                    <input
                                        type="password"
                                        value={formPassword}
                                        onChange={(e) => setFormPassword(e.target.value)}
                                        disabled={formSubmitting}
                                        placeholder={modalMode === 'create' ? "Enter password..." : "Enter new password..."}
                                        required={modalMode === 'create'}
                                    />
                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '4px', lineHeight: '1.2' }}>
                                        Must be at least 8 characters long, containing uppercase, lowercase, numbers, and special characters.
                                    </span>
                                </div>

                                <div className="input-group-glow">
                                    <label>SECURITY ROLE</label>
                                    <select
                                        value={formRole}
                                        onChange={(e) => setFormRole(e.target.value)}
                                        disabled={formSubmitting || (selectedUserId === currentUser.id)}
                                        style={{ width: '100%', padding: '10px', background: 'var(--bg-deep)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                    >
                                        <option value="STAFF">STAFF (Operator View Only)</option>
                                        <option value="ADMIN">ADMIN (Full Console Access)</option>
                                    </select>
                                </div>

                                {modalMode === 'edit' && (
                                    <div className="input-group-glow">
                                        <label>ACCOUNT STATUS</label>
                                        <select
                                            value={formIsActive ? 'active' : 'disabled'}
                                            onChange={(e) => setFormIsActive(e.target.value === 'active')}
                                            disabled={formSubmitting || (selectedUserId === currentUser.id)}
                                            style={{ width: '100%', padding: '10px', background: 'var(--bg-deep)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                        >
                                            <option value="active">ACTIVE (Allowed Access)</option>
                                            <option value="disabled">DISABLED (Access Blocked)</option>
                                        </select>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="btn-tech-action primary"
                                    disabled={formSubmitting}
                                    style={{ width: '100%', marginTop: '20px' }}
                                >
                                    {formSubmitting ? 'SAVING DATA...' : 'COMMIT CHANGES'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
