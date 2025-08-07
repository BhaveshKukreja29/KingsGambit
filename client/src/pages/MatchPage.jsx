import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import GameInterface from '../components/GameInterface';
import './MatchPage.css';

const MatchPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        const response = await axios.get(`/api/game-data/${id}`, {
          withCredentials: true 
        });
        
        // Map the backend response to the props expected by GameInterface
        setGameData({
            roomId: response.data.room_id,
            playerName: response.data.player_name,
            playerColor: response.data.player_color,
            opponentName: response.data.opponent_name,
            waiting: response.data.waiting_for_opponent,
            initialFen: response.data.initial_position, 
            initialMoves: response.data.moves_history
        });
        setError(null);
      } catch (err) {
        const errorMsg = err.response ? err.response.data.error : 'Failed to load game data.';
        setError(errorMsg);
        console.error("Error fetching game data:", errorMsg);
        if (err.response && (err.response.status === 404 || err.response.status === 403)) {
            setTimeout(() => navigate('/'), 4000);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();
  }, [id, navigate]);

  if (loading) {
    return <div>Loading game in room {id}...</div>;
  }

  if (error) {
    return <div>Error: {error} (Redirecting to home page...)</div>;
  }

  return (
    <div>
      {gameData && <GameInterface {...gameData} />}
    </div>
  );
};

export default MatchPage;