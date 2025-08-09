import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const [csrfToken, setCsrfToken] = useState(null); 

    useEffect(() => {
        const fetchCsrfToken = async () => {
        try {
            const response = await axios.get('api/get-csrf-token/');
            setCsrfToken(response.data.csrfToken);
        } catch (error) {
            console.error('Error fetching CSRF token:', error);
        }
        };
        if (user) {
        fetchCsrfToken();
        }
    }, [user]); 

    useEffect(() => {
        const checkUser = async () => {
            try {
                const response = await axios.get('/api/user/');
                if (response.data.isAuthenticated) {
                    setUser({ username: response.data.username });
                }
            } catch (error) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        checkUser();
    }, []);

    const login = (userData) => {
        setUser(userData);
    };

    const logout = async () => {
        try {
            await axios.post('/api/logout/', {}, {
                headers: { 'X-CSRFToken': csrfToken }
            });
            setUser(null);
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const value = {
        user,
        loading,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};

