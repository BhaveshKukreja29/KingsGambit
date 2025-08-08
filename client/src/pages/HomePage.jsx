import { useState, useEffect } from 'react'; 
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';  

const HomePage = () => {
  const [joinRoomId, setJoinRoomId] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!csrfToken) {
      console.error("CSRF token not available.");
      return;
    }
    try {
      const response = await axios.post('/api/create-room/', {}, {
          headers: { 'X-CSRFToken': csrfToken }
      });
      if (response.data && response.data.room_id) {
        navigate(`/lobby/${response.data.room_id}`);
      }
    } catch (error) {
      console.error('Error creating room:', error.response ? error.response.data : error.message);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!csrfToken) {
      console.error("CSRF token not available.");
      return;
    }
    try {
      const response = await axios.post('api/join-game/', {
        'room_id': joinRoomId,
      }, {
        headers: {
          'X-CSRFToken': csrfToken 
        }
      });
        
      if (response.data && response.data.room_id) {
        navigate(`/lobby/${response.data.room_id}`);
      }
    } catch (error) {
      console.error('Error joining room:', error.response ? error.response.data : error.message);
    }
  };

  return (
      <div className="home-page-container">
          <header className="home-header">
                {user && (
                    <span className="welcome-text">
                        Welcome, <strong>{user.username}</strong>
                    </span>
                )}
                <button onClick={logout} className="logout-btn">
                    Logout
                </button>
          </header>

          <main className="home-content">
              <img src="/logo.svg" alt="King's Gambit Logo" className="logo-image" />

              <div className="game-options-card">
                  <form onSubmit={handleCreateRoom}>
                      <button
                          type="submit"
                          className="action-btn"
                          disabled={!csrfToken}
                      >
                          {csrfToken ? "Create New Game" : "Loading..."}
                      </button>
                  </form>

                  <div className="divider">OR</div>

                  <form onSubmit={handleJoinRoom}>
                      <input
                          type="text"
                          placeholder="Enter Room ID"
                          value={joinRoomId}
                          onChange={(e) => setJoinRoomId(e.target.value)}
                          required
                          className="input-field"
                      />
                      <button
                          type="submit"
                          className="action-btn"
                          disabled={!csrfToken}
                      >
                          {csrfToken ? "Join Game" : "Loading..."}
                      </button>
                  </form>
              </div>
          </main>
      </div>
  );
};

export default HomePage;
