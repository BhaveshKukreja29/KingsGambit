import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        try {
            const response = await axios.post("/api/login/", {
                username,
                password,
            });
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
            <form onSubmit={handleLoginSubmit} className="auth-form">
                <h2>Login</h2>
                <p>Welcome back, King.</p>
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
                <button type="submit">Login</button>
                <p className="auth-link">
                    Don't have an account? <Link to="/register">Register</Link>
                </p>
            </form>
        </div>
    );
};

export default LoginPage;