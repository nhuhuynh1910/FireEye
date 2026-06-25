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
            setError(err.message || 'Failed to load users list.');
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
            setError('Please enter username and password.');
            return;
        }

        setFormSubmitting(true);
        try {
            if (modalMode === 'create') {
                await api.createUser(formUsername, formPassword, formFullName, formRole);
                setSuccess(`Account "${formUsername}" created successfully!`);
            } else {
                await api.updateUser(selectedUserId, formFullName, formRole, formPassword || null);
                setSuccess(`Account "${formUsername}" updated successfully!`);
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
            alert('You cannot delete your own account.');
            return;
        }

        if (!window.confirm(`Are you sure you want to delete the account "${username}"? This action cannot be undone.`)) {
            return;
        }

        setError('');
        setSuccess('');
        try {
            await api.deleteUser(userId);
            setSuccess(`Account "${username}" deleted successfully.`);
            loadUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to delete user.');
        }
    };

    if (currentUser.role !== 'ADMIN') {
        return (
            <div className="unauthorized-container">
                <div className="unauthorized-card">
                    <span className="shield-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                    </span>
                    <h2>Unauthorized Access</h2>
                    <p>You do not have Administrator (ADMIN) permissions to view this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="user-management-page">
            <div className="page-header-glow">
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">Manage system access permissions and roles for FireEye Dashboard</p>
                </div>
                <button className="btn-add-user-glow" onClick={openCreateModal}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="plus-icon">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Create New User
                </button>
            </div>

            {error && <div className="user-alert alert-error">{error}</div>}
            {success && <div className="user-alert alert-success">{success}</div>}

            <div className="table-glow-container">
                {loading ? (
                    <div className="table-loader">
                        <span className="spinner"></span>
                        <p>Loading user list...</p>
                    </div>
                ) : (
                    <table className="table-glow">
                        <thead>
                            <tr>
                                <th>USERNAME</th>
                                <th>FULL NAME</th>
                                <th>ROLE</th>
                                <th>DEFAULT PASSWORD</th>
                                <th>CREATED DATE</th>
                                <th style={{ textAlign: 'right' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => (
                                    <tr key={u.id} className={u.id === currentUser.id ? 'current-user-row' : ''}>
                                        <td>
                                            <span className="username-badge">{u.username}</span>
                                            {u.id === currentUser.id && <span className="self-tag">(Your account)</span>}
                                        </td>
                                        <td>{u.full_name || '—'}</td>
                                        <td>
                                            <span className={`role-badge ${u.role?.toLowerCase()}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td>
                                            {u.is_first_login ? (
                                                <span className="first-login-yes">Change Required</span>
                                            ) : (
                                                <span className="first-login-no">Changed</span>
                                            )}
                                        </td>
                                        <td className="date-cell">{u.created_at || '—'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                className="btn-action btn-edit" 
                                                onClick={() => openEditModal(u)}
                                                title="Edit details"
                                            >
                                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginRight: '4px', verticalAlign: 'middle' }}>
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                </svg>
                                                Edit
                                            </button>
                                            {u.id !== currentUser.id && (
                                                <button 
                                                    className="btn-action btn-delete" 
                                                    onClick={() => handleDeleteUser(u.id, u.username)}
                                                    title="Delete user"
                                                >
                                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginRight: '4px', verticalAlign: 'middle' }}>
                                                        <polyline points="3 6 5 6 21 6"/>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                                        <line x1="10" y1="11" x2="10" y2="17"/>
                                                        <line x1="14" y1="11" x2="14" y2="17"/>
                                                    </svg>
                                                    Delete
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
                            <h2>{modalMode === 'create' ? 'CREATE NEW ACCOUNT' : 'EDIT ACCOUNT DETAILS'}</h2>
                            <button className="btn-close-modal" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="modal-form">
                            {error && <div className="modal-error-alert">{error}</div>}

                            <div className="form-group-glow">
                                <label>USERNAME</label>
                                <input
                                    type="text"
                                    value={formUsername}
                                    onChange={(e) => setFormUsername(e.target.value)}
                                    disabled={modalMode === 'edit' || formSubmitting}
                                    placeholder="Example: staff1"
                                    required
                                />
                            </div>

                            <div className="form-group-glow">
                                <label>FULL NAME</label>
                                <input
                                    type="text"
                                    value={formFullName}
                                    onChange={(e) => setFormFullName(e.target.value)}
                                    disabled={formSubmitting}
                                    placeholder="Enter full name..."
                                />
                            </div>

                            <div className="form-group-glow">
                                <label>PASSWORD {modalMode === 'edit' && '(Leave blank to keep current)'}</label>
                                <input
                                    type="password"
                                    value={formPassword}
                                    onChange={(e) => setFormPassword(e.target.value)}
                                    disabled={formSubmitting}
                                    placeholder={modalMode === 'create' ? "Enter password..." : "Enter new password..."}
                                    required={modalMode === 'create'}
                                />
                            </div>

                            <div className="form-group-glow">
                                <label>ROLE</label>
                                <select
                                    value={formRole}
                                    onChange={(e) => setFormRole(e.target.value)}
                                    disabled={formSubmitting || (selectedUserId === currentUser.id)}
                                >
                                    <option value="STAFF">STAFF (Duty Personnel)</option>
                                    <option value="ADMIN">ADMIN (System Administrator)</option>
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-modal btn-modal-cancel"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={formSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-modal btn-modal-submit"
                                    disabled={formSubmitting}
                                >
                                    {formSubmitting ? 'SAVING...' : 'SAVE CHANGES'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
