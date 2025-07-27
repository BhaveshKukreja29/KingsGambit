import React, { useEffect, useState, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
//import './App.css';

const Board = ({ roomId, playerColor }) => {
  const [game] = useState(new Chess()); 
  const [fen, setFen] = useState('start'); 
  const socket = useRef(null); 
  const [status, setStatus] = useState(''); 
  const moveHistoryRef = useRef(null); 

  useEffect(() => {
    if (!roomId) {
      return;
    } 

    socket.current = new WebSocket(`ws://localhost:8000/ws/match/${roomId}/`);

    socket.current.onopen = () => {
      console.log('WebSocket connection opened.');
    };

    socket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'move_made') {
        const move = {
          from: data.from,
          to: data.to,
        }
        game.move(move); 
        setFen(game.fen()); 
        appendMove(data.move.san); 
        updateStatus(); 
      }
    };

    socket.current.onclose = () => {
      console.log('WebSocket connection closed.');
    };

    socket.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    updateStatus(); 

    return () => {
      if (socket.current && socket.current.readyState === WebSocket.OPEN) {
        socket.current.close();
      }
    };
  }, [roomId]);

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
    });

    if (!move) return false; 

    setFen(game.fen()); 
    // Send move to Django Channels backend
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({
        type: 'move', 
        from: sourceSquare,
        to: targetSquare,
        fen: game.fen(),
        move: move 
      }));
    }
    appendMove(move.san);
    updateStatus(); 
    return true; 
  };

  const isDraggalbe = ({ piece }) => {
    const isMyTurn = (game.turn() === 'w' && playerColor === 'white') || 
                      (game.turn() === 'b' && playerColor === 'black');
  
    const isMyPiece = piece.startsWith(playerColor.charAt(0));

    return isMyTurn && isMyPiece;
  }

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
        isDraggablePiece={isDraggalbe}
        areArrowsAllowed={true}
      />
    </div>
  );
};

export default Board;