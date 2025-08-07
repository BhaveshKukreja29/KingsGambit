import React, { useState, useEffect, useRef, useCallback } from 'react';
import Board from './Board';
import Chat from './Chat';
import VideoCall from './VideoCall';
import { Chess } from 'chess.js';

const GameInterface = ({ roomId, playerName, playerColor, opponentName: initialOpponentName }) => {
    const [game, setGame] = useState(new Chess());
    const [fen, setFen] = useState('start');
    const [status, setStatus] = useState('Connecting to game...');
    const [moveHistory, setMoveHistory] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [opponentName, setOpponentName] = useState(initialOpponentName);
    const [opponentPeerId, setOpponentPeerId] = useState(null);
    const socket = useRef(null);

    useEffect(() => {
        if (!roomId) return;

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host;
        const socketUrl = `${wsProtocol}//${wsHost}/ws/match/${roomId}/`;

        socket.current = new WebSocket(socketUrl);

        socket.current.onopen = () => console.log('WebSocket connection established.');
        socket.current.onclose = () => setStatus('Connection Lost. Please refresh.');

        socket.current.onmessage = (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'game_state_update':
                    const newGame = new Chess(data.fen);
                    setGame(newGame);
                    setFen(data.fen);
                    setMoveHistory(data.moves || []);
                    
                    if (playerColor === 'white') {
                        setOpponentName(data.black_player || 'Waiting...');
                    } else {
                        setOpponentName(data.white_player || 'Waiting...');
                    }
                    updateStatus(newGame);
                    break;

                case 'chat_message':
                    setChatMessages(prev => [...prev, { sender: data.sender, message: data.message, isSent: false }]);
                    break;
                
                case 'video_signal':
                    if (data.sender !== playerName) {
                        setOpponentPeerId(data.peerId);
                    }
                    break;
                
                case 'error':
                    // revert if illegal move
                    console.error('Server error:', data.message);
                    setFen(game.fen());
                    updateStatus(game);
                    break;
                
                default:
                    break;
            }
        };

        return () => {
            if (socket.current) {
                socket.current.close();
            }
        };
    }, [roomId, playerName, playerColor]);
    
    const updateStatus = useCallback((currentGame) => {
        let statusText = '';
        const moveColor = currentGame.turn() === 'b' ? 'Black' : 'White';

        if (currentGame.isCheckmate()) {
            statusText = `Checkmate! ${moveColor} loses.`;
        } else if (currentGame.isDraw()) {
            statusText = 'Draw!';
        } else {
            statusText = `${moveColor}'s turn`;
            if (currentGame.inCheck()) {
                statusText += ' - Check!';
            }
        }
        setStatus(statusText);
    }, []);
    
    const sendSocketMessage = useCallback((data) => {
        if (socket.current && socket.current.readyState === WebSocket.OPEN) {
            socket.current.send(JSON.stringify(data));
        }
    }, []);

    const handlePieceDrop = (sourceSquare, targetSquare) => {
        const moveData = {
            from: sourceSquare,
            to: targetSquare,
            promotion: 'q',
        };
        
        // try the move locally
        const gameCopy = new Chess(fen);
        const moveResult = gameCopy.move(moveData);

        // we optimistically update the UI first
        if (moveResult !== null) {
            setFen(gameCopy.fen());
            sendSocketMessage({ type: 'move', from: sourceSquare, to: targetSquare });
            updateStatus(gameCopy);
            return true;
        }
        
        return false;
    };

    const handleSendMessage = (message) => {
        setChatMessages(prev => [...prev, { sender: playerName, message, isSent: true }]);
        sendSocketMessage({ type: 'chat_message', message });
    };

    const handlePeerOpen = useCallback((peerId) => {
        sendSocketMessage({ type: 'video_signal', peerId });
    }, [sendSocketMessage]);

    return (
        <div className="game-container">
            <div className="moves-section">
                <h3>Move History</h3>
                <div id="moveHistory">
                    {moveHistory.map((move, index) => (
                        <div key={index}>{index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ''}{move}</div>
                    ))}
                </div>
                <div id="gameInfo">
                    <p>Room ID: <strong>{roomId}</strong></p>
                    <p>Your Name: <strong>{playerName} ({playerColor})</strong></p>
                    <p>Opponent: <strong>{opponentName}</strong></p>
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
                <VideoCall onPeerOpen={handlePeerOpen} opponentPeerId={opponentPeerId} />
                <Chat messages={chatMessages} onSendMessage={handleSendMessage} />
            </div>
        </div>
    );
};

export default GameInterface;