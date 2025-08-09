import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import './AuthPage.css'

const RegisterPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        if (password !== confirmPassword) {
            setFormError("Passwords do not match.");
            return;
        }

        try {
            const response = await axios.post(
                "/api/register/", 
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
                const errorData = error.response.data.error;
                setFormError(Array.isArray(errorData) ? errorData.join(' ') : errorData);
            } else {
                setFormError("An unexpected error occurred.");
            }
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
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
            <form onSubmit={handleRegisterSubmit} className="auth-form">
                <h2>Create Account</h2>
                <p className="subtitle">Become the King of the board.</p>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <div className="password-input-container">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <img 
                        src={showPassword ? "/eye.png" : "/closeEye.png"} 
                        alt="Toggle Password" onClick={togglePasswordVisibility}
                    />
                </div>
                    
                <div className="password-input-container">
                    <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                    <img 
                        src={showConfirmPassword ? "/eye.png" : "/closeEye.png"} 
                        alt="Toggle Password" onClick={toggleConfirmPasswordVisibility}
                    />
                </div>
                {formError && <p className="error-message">{formError}</p>}
                <button type="submit" disabled={!csrfToken}>
                    {csrfToken ? "Register" : "Loading..."}
                </button>
                <p className="auth-link">
                    Already a King? <Link to="/login">Login</Link>
                </p>
            </form>
        </div>
    </div>
);
};

export default RegisterPage;