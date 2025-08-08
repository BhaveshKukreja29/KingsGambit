import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LobbyPage.css';

const LobbyPage = () => {
    const { id: roomId } = useParams();
    const navigate = useNavigate();
    const [lobbyData, setLobbyData] = useState(null);
    const [error, setError] = useState('');
    const [isReady, setIsReady] = useState(false);
    const socket = useRef(null);

    useEffect(() => {
        const fetchLobbyData = async () => {
            try {
                const response = await axios.get(`/api/lobby-data/${roomId}`);
                setLobbyData(response.data);
                if (response.data.isUserWhite) {
                    setIsReady(response.data.whitePlayerReady);
                } else {
                    setIsReady(response.data.blackPlayerReady);
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load lobby.');
                setTimeout(() => navigate('/'), 3000);
            }
        };
        fetchLobbyData();
    }, [roomId, navigate]);

    useEffect(() => {
        if (!roomId) return;
        const socketUrl = `ws://localhost:8000/ws/lobby/${roomId}/`;
        socket.current = new WebSocket(socketUrl);

        socket.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'lobby_state_update') {
                setLobbyData(prev => ({ ...prev, ...data }));
            }
        };

        return () => socket.current?.close();
    }, [roomId]);

    useEffect(() => {
        if (lobbyData?.whitePlayerReady && lobbyData?.blackPlayerReady) {
            setTimeout(() => navigate(`/match/${roomId}`), 1500);
        }
    }, [lobbyData, navigate, roomId]);

    const handleReadyClick = () => {
        if (socket.current?.readyState === WebSocket.OPEN  && !isReady) {
            socket.current.send(JSON.stringify({ type: 'player_ready' }));
            setIsReady(true);
        }
    };

    const getStatusText = () => {
        if (!lobbyData) return "Loading Lobby...";
        if (lobbyData.whitePlayerReady && lobbyData.blackPlayerReady) {
            return "Both players are ready! Starting game...";
        }
        if (!lobbyData.blackPlayer) {
            return "Waiting for an opponent to join...";
        }
        return "Waiting for players to be ready...";
    };

    const renderPlayerCard = (playerName, isReady) => (
        <div className="player-card">
            <h3>{playerName  || "Empty Slot"}</h3>
            {playerName && (
                <p className={`ready-status ${isReady ? 'ready' : ''}`}>
                    {isReady ? 'Ready' : 'Not Ready'}
                </p>
            )}
        </div>
    );

    if (error) return <div className="lobby-container"><h1>Error: {error}</h1></div>;
    if (!lobbyData) return <div className="lobby-container"><h1>Loading...</h1></div>;

    return (
        <div className="lobby-container">
            <div className="lobby-box">
                <h2>Game Lobby</h2>
                <p className="status-text">{getStatusText()}</p>

                {renderPlayerCard(lobbyData.whitePlayer, lobbyData.whitePlayerReady)}

                {lobbyData.blackPlayer ? (
                    renderPlayerCard(lobbyData.blackPlayer, lobbyData.blackPlayerReady)
                ) : (
                    <div className="player-card">
                        <h3>Waiting for Opponent...</h3>
                        <input
                            readOnly
                            type="text"
                            value={roomId}
                            className="copy-link-input"
                            onClick={(e) => navigator.clipboard.writeText(e.target.value)}
                        />
                    </div>
                )}

                <div className="lobby-actions">
                    {lobbyData.blackPlayer && (
                        <button onClick={handleReadyClick} disabled={isReady}>
                            {isReady ? 'Waiting for Opponent' : 'Ready to Play'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LobbyPage;