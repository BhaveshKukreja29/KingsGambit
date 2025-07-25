import React, { useState, useEffect } from 'react'; 
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './HomePage.css';

const HomePage = () => {
  const [createRoomName, setCreateRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinRoomName, setJoinRoomName] = useState('');
  const navigate = useNavigate();
  const [csrfToken, setCsrfToken] = useState(null); 

  const apiClient = axios.create({
      baseURL: 'http://localhost:8000',
      withCredentials: true
  });

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await apiClient.get('/get-csrf-token/');
        setCsrfToken(response.data.csrfToken);
      } catch (error) {
        console.error('Error fetching CSRF token:', error);
      }
    };
    fetchCsrfToken();
  }, []); 

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!csrfToken) {
      console.error("CSRF token not available.");
      return;
    }
    try {
      const response = await apiClient.post('/create-room/', new URLSearchParams({
        'player_name': createRoomName
      }), {
        headers: {
          'X-CSRFToken': csrfToken 
        }
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
      const response = await apiClient.post('/join-game/', new URLSearchParams({
        'room_id': joinRoomId,
        'player_name': joinRoomName
      }), {
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
          {/* <img src="/static/assets/logo.svg" alt="Logo" /> */}
          <h2>Create New Game</h2>
          <form onSubmit={handleCreateRoom}>
              <input
                  type="text"
                  placeholder="Enter your name"
                  value={createRoomName}
                  onChange={(e) => setCreateRoomName(e.target.value)}
                  required
                  className="input-field"
              />
              <button type="submit">Create Game</button>
          </form>

          <div className="join-section">
              <h3>Or Join Existing Game</h3>
              <form onSubmit={handleJoinRoom}>
                  <input
                      type="text"
                      placeholder="Enter your name"
                      value={joinRoomName}
                      onChange={(e) => setJoinRoomName(e.target.value)}
                      required
                      className="input-field"
                  />
                  <input
                      type="text"
                      placeholder="Enter room ID"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value)}
                      required
                      className="input-field"
                  />
                  <button type="submit">Join Game</button>
              </form>
          </div>
      </div>
  );
};

export default HomePage;