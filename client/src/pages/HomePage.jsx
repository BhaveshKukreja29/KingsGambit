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
        navigate(`/match/${response.data.room_id}`);
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
        navigate(`/match/${response.data.room_id}`);
      }
    } catch (error) {
      console.error('Error joining room:', error.response ? error.response.data : error.message);
    }
  };

  return (
        <div className="home-container">
            <header className="home-header">
                {user && <span>Welcome, {user.username}</span>}
                <button onClick={logout} className="logout-btn">Logout</button>
            </header>
            
            <h2>Create New Game</h2>
            <form onSubmit={handleCreateRoom}>
                <button type="submit">Create Game</button>
            </form>

            <div className="join-section">
                <h3>Or Join Existing Game</h3>
                <form onSubmit={handleJoinRoom}>
                    <input
                        type="text"
                        placeholder="Enter room ID"
                        value={joinRoomId}
                        onChange={(e) => setJoinRoomId(e.target.value)}
                        required
                        className="input-field"
                    />
                    <button type="submit" disabled={!csrfToken}>
                      {csrfToken ? "Join Game" : "Loading..."}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default HomePage;
