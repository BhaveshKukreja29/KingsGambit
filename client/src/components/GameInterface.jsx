import React, { useEffect, useState, useRef } from 'react';
import Board from './Board';
import Chat from './Chat';
import VideoCall from './VideoCall';

const GameInterface = ({ roomId, playerName, playerColor, opponentName: initialOpponentName, waiting }) => {
  const [currentOpponentName, setCurrentOpponentName] = useState(initialOpponentName);
  const [isWaiting, setIsWaiting] = useState(waiting);
  const socket = useRef(null);

  useEffect(() => {
    setIsWaiting(waiting); 
    if (!waiting && initialOpponentName) {
      setCurrentOpponentName(initialOpponentName);
    }

    if (!roomId) return;

    socket.current = new WebSocket(`ws://localhost:8000/ws/match/${roomId}/`);

    socket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'opponent_joined') {
        setIsWaiting(false);
        if (playerColor === 'white') {
          setCurrentOpponentName(data.black_player_name);
        } else if (playerColor === 'black') {
          setCurrentOpponentName(data.white_player_name);
        }
      }
    };

    return () => {
      if (socket.current) {
        socket.current.close();
      }
    };
  }, [roomId, waiting, initialOpponentName, playerColor]);


  useEffect(() => {
    window.PLAYER_COLOR = playerColor;
    window.ROOM_ID = roomId;
  }, [playerColor, roomId]);

  return (
    <div className="game-container">
      <div className="board-section">
        <div className="status" data-waiting={waiting}>
          <h2 id="statusText">
            {isWaiting ? 'Waiting for opponent to join...' : `Playing against: ${currentOpponentName}`}
          </h2>
        </div>
        <Board roomId={roomId} playerColor={playerColor} />
      </div>
      <div className="right-section">
        <VideoCall roomId={roomId} />
        <Chat roomId={roomId} playerName={playerName} />
      </div>
    </div>
  );
};

export default GameInterface;