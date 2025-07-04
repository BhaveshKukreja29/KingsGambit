import React, { useEffect } from 'react';
import Board from './Board';
import Chat from './Chat';
import VideoCall from './VideoCall';

const GameInterface = ({ roomId, playerName, playerColor, opponentName, waiting }) => {
  useEffect(() => {
    window.PLAYER_COLOR = playerColor;
    window.ROOM_ID = roomId;
  }, [playerColor, roomId]);

  return (
    <div className="game-container">
      <div className="board-section">
        <div className="status" data-waiting={waiting}>
          <h2 id="statusText">
            {waiting ? 'Waiting for opponent to join...' : `Playing against: ${opponentName}`}
          </h2>
        </div>
        <Board />
      </div>
      <div className="right-section">
        <VideoCall roomId={roomId} />
        <Chat roomId={roomId} playerName={playerName} />
      </div>
    </div>
  );
};

export default GameInterface;