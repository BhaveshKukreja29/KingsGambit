import React, { useState, useEffect, useRef, useCallback } from 'react';
import Board from './Board';
import Chat from './Chat';
import VideoCall from './VideoCall';
import { Chess } from 'chess.js';

const GameInterface = ({ roomId, playerName, playerColor, opponentName: initialOpponentName, waiting }) => {
  // State Management
  const [isWaiting, setIsWaiting] = useState(waiting);
  const [opponentName, setOpponentName] = useState(initialOpponentName);
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState('start');
  const [status, setStatus] = useState('Waiting for connection...');
  const [moveHistory, setMoveHistory] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [opponentPeerId, setOpponentPeerId] = useState(null);

  const socket = useRef(null);

  // --- WebSocket Connection Management ---
  useEffect(() => {
    if (!roomId) return;

    // Establish a single WebSocket connection
    socket.current = new WebSocket(`ws://localhost:8000/ws/match/${roomId}/`);

    socket.current.onopen = () => {
      console.log('WebSocket connection established.');
      updateStatus();
    };

    socket.current.onclose = () => {
      console.log('WebSocket connection closed.');
      setStatus('Connection Lost. Please refresh.');
    };

    socket.current.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setStatus('Connection Error. Please refresh.');
    };

    // Central message handler
    socket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'opponent_joined':
          setIsWaiting(false);
          setOpponentName(playerColor === 'white' ? data.black_player_name : data.white_player_name);
          updateStatus();
          break;
        case 'move_made':
          const move = game.move({ from: data.from, to: data.to, promotion: 'q' });
          if (move) {
            setFen(game.fen());
            setMoveHistory(prev => [...prev, move.san]);
            updateStatus();
          }
          break;
        case 'chat_message':
          if (data.sender !== playerName) {
            setChatMessages(prev => [...prev, { sender: data.sender, message: data.message, isSent: false }]);
          }
          break;
        case 'video_signal':
          if (data.sender !== playerName) {
            setOpponentPeerId(data.peerId);
          }
          break;
        default:
          break;
      }
    };

    // Cleanup on component unmount
    return () => {
      if (socket.current) {
        socket.current.close();
      }
    };
  }, [roomId, playerName, playerColor, game]); // Re-run if essential props change

  // --- Game Logic and Status ---
  const updateStatus = useCallback(() => {
    if (isWaiting) {
      setStatus('Waiting for opponent to join...');
      return;
    }

    let statusText = '';
    const moveColor = game.turn() === 'b' ? 'Black' : 'White';

    if (game.isCheckmate()) {
      statusText = `Checkmate! ${moveColor} loses.`;
    } else if (game.isDraw()) {
      statusText = 'Draw!';
    } else {
      statusText = `${moveColor}'s turn`;
      if (game.inCheck()) {
        statusText += ' - Check!';
      }
    }
    setStatus(statusText);
  }, [game, isWaiting]);

  useEffect(() => {
    updateStatus();
  }, [isWaiting, fen, updateStatus]);


  // --- Child Component Callbacks (Functions passed as props) ---

  const sendSocketMessage = (data) => {
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify(data));
    }
  };

  const handlePieceDrop = (sourceSquare, targetSquare) => {
    const move = game.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    if (move === null) return false; 

    const newFen = game.fen(); 

    setFen(newFen);
    setMoveHistory(prev => [...prev, move.san]);
    updateStatus();

    sendSocketMessage({
      type: 'move',
      from: sourceSquare,
      to: targetSquare,
      fen: newFen,      
      move: move,      
    });

    return true;
  };


  const handleSendMessage = (message) => {
    setChatMessages(prev => [...prev, { sender: playerName, message, isSent: true }]);
    sendSocketMessage({
      type: 'chat_message',
      message: message,
      sender: playerName,
    });
  };
  
  const handlePeerOpen = (peerId) => {
     sendSocketMessage({
      type: 'video_signal',
      peerId: peerId,
      sender: playerName,
    });
  };

  return (
    <div className="game-container">
      <div className="moves-section">
        <h3>Move History</h3>
        <div id="moveHistory">
            {moveHistory.map((move, index) => (
                <div key={index}>{index % 2 === 0 ? `${index/2 + 1}. ` : ''}{move}</div>
            ))}
        </div>
        <div id="gameInfo">
          <p>Room ID: <strong>{roomId}</strong></p>
          <p>Your Name: <strong>{playerName}</strong></p>
        </div>
      </div>
      
      <div className="board-section">
        <Board 
          fen={fen} 
          onPieceDrop={handlePieceDrop}
          playerColor={playerColor}
          game={game}
          status={status}
        />
      </div>
      
      <div className="right-section">
        <VideoCall 
            onPeerOpen={handlePeerOpen}
            opponentPeerId={opponentPeerId}
        />
        <Chat 
            messages={chatMessages} 
            onSendMessage={handleSendMessage} 
        />
      </div>
    </div>
  );
};

export default GameInterface;