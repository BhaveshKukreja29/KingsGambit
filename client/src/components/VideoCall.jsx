import React, { useEffect, useRef } from 'react';
import Peer from 'peerjs';
//import './App.css';

const VideoCall = ({ roomId }) => {
  const socket = useRef(null); 
  const peer = useRef(null);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const currentCall = useRef(null);
  const localStream = useRef(null);

  useEffect(() => { 
    socket.current = new WebSocket(`ws://localhost:8000/ws/match/${roomId}/`);

    socket.current.onopen = () => {
      console.log('VideoCall WebSocket connection opened.');
      if (localStream.current && peer.current && peer.current.id) {
         socket.current.send(JSON.stringify({
            type: 'peer_id', 
            peerId: peer.current.id,
            room: roomId
         }));
      }
    };

    socket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'opponent_ready_for_call') { 
        if (!peer.current || !localStream.current) return;
        const call = peer.current.call(data.peerId, localStream.current); 
        call.on('stream', stream => { 
          remoteVideo.current.srcObject = stream; 
        });
      }
    };

    socket.current.onclose = () => {
      console.log('VideoCall WebSocket connection closed.');
    };

    socket.current.onerror = (error) => {
      console.error('VideoCall WebSocket error:', error);
    };

    const videoStatus = document.createElement('div'); 
    videoStatus.className = 'video-status active'; 
    document.querySelector('.video-container').appendChild(videoStatus); 

    const updateVideoStatus = (msg) => { 
      videoStatus.textContent = msg; 
    };

    const initializePeer = () => { 
      if (peer.current) peer.current.destroy(); 

      peer.current = new Peer(); 

      peer.current.on('open', id => { 
        if (socket.current && socket.current.readyState === WebSocket.OPEN) {
          socket.current.send(JSON.stringify({
            type: 'peer_id',
            peerId: id,
            room: roomId
          }));
        }
      });

      peer.current.on('call', call => { 
        currentCall.current = call; 
        call.answer(localStream.current); 
        call.on('stream', stream => { 
          remoteVideo.current.srcObject = stream; 
        });
      });
    };

    const startVideo = async () => { 
      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); 
        localVideo.current.srcObject = localStream.current; 
        updateVideoStatus('Camera Ready'); 
        initializePeer(); 
      } catch (err) { 
        updateVideoStatus('Failed to access camera'); 
      }
    };

    const toggleAudio = () => {
      if (!localStream.current) return; 
      localStream.current.getAudioTracks().forEach(track => { 
        track.enabled = !track.enabled; 
      });
    };

    document.getElementById('startVideo').addEventListener('click', startVideo); 
    document.getElementById('toggleAudio').addEventListener('click', toggleAudio); 

    return () => { 
      document.getElementById('startVideo').removeEventListener('click', startVideo);
      document.getElementById('toggleAudio').removeEventListener('click', toggleAudio);
      if (peer.current) peer.current.destroy(); 
      if (socket.current && socket.current.readyState === WebSocket.OPEN) {
        socket.current.close(); 
      }
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId]); 

  return ( 
    <div className="video-section">
      <div className="video-container">
        <video id="localVideo" ref={localVideo} autoPlay muted playsInline />
        <video id="remoteVideo" ref={remoteVideo} autoPlay playsInline />
      </div>
      <div className="video-controls">
        <button id="startVideo">Start Video</button>
        <button id="toggleAudio">Mute</button>
      </div>
    </div>
  ); 
};

export default VideoCall;