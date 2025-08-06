import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const RegisterPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [formError, setFormError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        if (password !== confirmPassword) {
            setFormError("Passwords do not match.");
            return;
        }

        try {
            const response = await axios.post("/api/register/", {
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
            <form onSubmit={handleRegisterSubmit} className="auth-form">
                <h2>Create Account</h2>
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
                <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
                {formError && <p className="error-message">{formError}</p>}
                <button type="submit">Register</button>
                <p className="auth-link">
                    Already a King? <Link to="/login">Login</Link>
                </p>
            </form>
        </div>
    );
};

export default RegisterPage;