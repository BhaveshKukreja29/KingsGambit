import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const Chat = ({ roomId, playerName }) => {
  const socket = useRef(io());
  const chatInput = useRef(null);
  const chatMessages = useRef(null);

  useEffect(() => {
    const addMessage = (message, isSent) => {
      const div = document.createElement('div');
      div.className = `message ${isSent ? 'sent' : 'received'}`;
      div.textContent = message;
      chatMessages.current.appendChild(div);
      chatMessages.current.scrollTop = chatMessages.current.scrollHeight;
    };

    socket.current.on('chat_message', ({ message, sender }) => {
      if (sender !== playerName) addMessage(`${sender}: ${message}`, false);
    });

    const handleSend = () => {
      const msg = chatInput.current.value.trim();
      if (msg) {
        socket.current.emit('chat_message', {
          message: msg,
          room: roomId,
          sender: playerName
        });
        addMessage(msg, true);
        chatInput.current.value = '';
      }
    };

    document.getElementById('sendMessage').addEventListener('click', handleSend);
    return () => socket.current.disconnect();
  }, [roomId, playerName]);

  return (
    <div className="chat-section">
      <div className="chat-messages" id="chatMessages" ref={chatMessages}></div>
      <div className="chat-input-container">
        <input type="text" className="chat-input" id="chatInput" ref={chatInput} placeholder="Type your message..." />
        <button className="chat-send-btn" id="sendMessage">Send</button>
      </div>
    </div>
  );
};

export default Chat;
