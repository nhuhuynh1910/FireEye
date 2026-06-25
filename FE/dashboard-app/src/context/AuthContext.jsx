import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            const data = await api.getMe();
            setUser(data);
            setIsAuthenticated(true);
        } catch (err) {
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback(async (username, password) => {
        setIsLoading(true);
        try {
            const res = await api.login(username, password);
            if (res && res.success) {
                setUser(res.user);
                setIsAuthenticated(true);
                return res.user;
            }
            throw new Error("Login failed");
        } catch (err) {
            setIsAuthenticated(false);
            setUser(null);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        setIsLoading(true);
        try {
            await api.logout();
        } catch (err) {
            console.error("Error logging out from server:", err);
        } finally {
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
        }
    }, []);

    const updateFirstLoginFlag = useCallback(() => {
        if (user) {
            setUser(prev => ({
                ...prev,
                is_first_login: false
            }));
        }
    }, [user]);

    // Handle token expiration/unauthorized events dispatched from api.js
    useEffect(() => {
        const handleUnauthorized = () => {
            setUser(null);
            setIsAuthenticated(false);
        };

        window.addEventListener('auth-unauthorized', handleUnauthorized);
        
        // Initial auth check on mount
        checkAuth();

        return () => {
            window.removeEventListener('auth-unauthorized', handleUnauthorized);
        };
    }, [checkAuth]);

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated,
            isLoading,
            login,
            logout,
            checkAuth,
            updateFirstLoginFlag
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
