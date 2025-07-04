import React, { useEffect, useState, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import io from 'socket.io-client';
import './App.css';

const Board = () => {
  const [game] = useState(new Chess());
  const [fen, setFen] = useState('start');
  const socket = useRef(null);
  const [status, setStatus] = useState('');
  const moveHistoryRef = useRef(null);

  const playerColor = window.PLAYER_COLOR;
  const roomId = window.ROOM_ID;

  useEffect(() => {
    socket.current = io();

    socket.current.on('move', ({ move }) => {
      game.move(move);
      setFen(game.fen());
      appendMove(move.san);
      updateStatus();
    });

    updateStatus();

    return () => socket.current.disconnect();
  }, []);

  const appendMove = (san) => {
    const div = document.createElement('div');
    div.textContent = san;
    moveHistoryRef.current.appendChild(div);
  };

  const updateStatus = () => {
    let statusText = '';
    const moveColor = game.turn() === 'b' ? 'Black' : 'White';

    if (game.isCheckmate()) {
      statusText = `Game over, ${moveColor} is in checkmate.`;
    } else if (game.isDraw()) {
      statusText = 'Game over, drawn position';
    } else {
      statusText = `${moveColor}'s turn`;
    }

    setStatus(statusText);
  };

  const onDrop = (sourceSquare, targetSquare) => {
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q'
    });

    if (!move) return false;

    setFen(game.fen());
    socket.current.emit('move', { move, room: roomId });
    appendMove(move.san);
    updateStatus();
    return true;
  };

  return (
    <div className="board-section">
      <div className="status">
        <h2>{status}</h2>
      </div>
      <div id="moveHistory" ref={moveHistoryRef} />
      <Chessboard
        position={fen}
        onPieceDrop={onDrop}
        boardOrientation={playerColor}
      />
    </div>
  );
};

export default Board;
