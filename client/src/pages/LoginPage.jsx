import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import './AuthPage.css'

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState('');
    const [csrfToken, setCsrfToken] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        const fetchCsrfToken = async () => {
            try {
                const { data } = await axios.get('/api/get-csrf-token/', { withCredentials: true });
                setCsrfToken(data.csrfToken);
            } catch (error) {
                console.error('Could not fetch CSRF token', error);
                setFormError('Could not connect to the server. Please try again later.');
            }
        };
        fetchCsrfToken();
    }, []);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        try {
            const response = await axios.post(
                "/api/login/", 
                { username, password },
                {
                    headers: { 'X-CSRFToken': csrfToken },
                    withCredentials: true
                }
            );
            login({ username: response.data.username });
            navigate('/');
        } catch (error) {
            if (error.response && error.response.data) {
                setFormError(error.response.data.error);
            } else {
                setFormError("An unexpected error occurred.");
            }
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-visual">
                <div className="visual-content-wrapper">
                    <h1>King's Gambit</h1>
                    <p>Where every move defines a legacy.</p>
                </div>
                <div className="visual-images">
                    <img src="/King.png" alt="King Piece" />
                    <img src="/Queen.png" alt="Queen Piece" />
                </div>
            </div>

            <div className="auth-content">
                <form onSubmit={handleLoginSubmit} className="auth-form">
                    <h2>Login</h2>
                    <p className="subtitle">Welcome back, King.</p>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    {formError && <p className="error-message">{formError}</p>}
                    <button type="submit" disabled={!csrfToken}>
                        {csrfToken ? "Login" : "Loading..."}
                    </button>
                    <p className="auth-link">
                        Don't have an account? <Link to="/register">Register</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;