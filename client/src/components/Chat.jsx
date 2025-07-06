import React, { useEffect, useRef } from 'react';
//import './App.css'; 

const Chat = ({ roomId, playerName }) => { 
  const socket = useRef(null); 
  const chatInput = useRef(null); 
  const chatMessages = useRef(null); 

  useEffect(() => {
    socket.current = new WebSocket(`ws://localhost:8000/ws/match/${roomId}/`);

    socket.current.onopen = () => {
      console.log('Chat WebSocket connection opened.');
    };

    socket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chat_message') {
        if (data.sender !== playerName) { 
          addMessage(`${data.sender}: ${data.message}`, false); 
        }
      }
    };

    socket.current.onclose = () => {
      console.log('Chat WebSocket connection closed.');
    };

    socket.current.onerror = (error) => {
      console.error('Chat WebSocket error:', error);
    };

    const addMessage = (message, isSent) => { 
      const div = document.createElement('div'); 
      div.className = `message ${isSent ? 'sent' : 'received'}`; 
      div.textContent = message; 
      chatMessages.current.appendChild(div); 
      chatMessages.current.scrollTop = chatMessages.current.scrollHeight; 
    };

    const handleSend = () => { 
      const msg = chatInput.current.value.trim(); 
      if (msg) { 
        if (socket.current && socket.current.readyState === WebSocket.OPEN) {
          socket.current.send(JSON.stringify({
            type: 'chat_message', 
            message: msg, 
            room: roomId, 
            sender: playerName 
          }));
        }
        addMessage(msg, true); 
        chatInput.current.value = ''; 
      }
    };

    document.getElementById('sendMessage').addEventListener('click', handleSend); // cite: 170

    return () => { 
      document.getElementById('sendMessage').removeEventListener('click', handleSend);
      if (socket.current && socket.current.readyState === WebSocket.OPEN) {
        socket.current.close(); 
      }
    };
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