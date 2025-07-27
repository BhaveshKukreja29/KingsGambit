import React, { useEffect, useRef } from 'react';
import Peer from 'peerjs';

const VideoCall = ({ onPeerOpen, opponentPeerId }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const currentCallRef = useRef(null);

  useEffect(() => {
    const initializePeer = () => {
      if (peerRef.current) peerRef.current.destroy();

      peerRef.current = new Peer(undefined, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ]
        }
      });

      peerRef.current.on('open', (id) => {
        onPeerOpen(id); // Send our PeerJS ID to the parent for signaling
      });

      peerRef.current.on('call', (call) => {
        currentCallRef.current = call;
        call.answer(localStreamRef.current);
        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });
      });
    };

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        initializePeer();
      } catch (err) {
        console.error('Failed to get local stream', err);
      }
    };
    
    document.getElementById('startVideo').addEventListener('click', startVideo);

    return () => {
      if (peerRef.current) peerRef.current.destroy();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
       document.getElementById('startVideo').removeEventListener('click', startVideo);
    };
  }, [onPeerOpen]);

  // Effect to initiate call when opponent's peer ID is received
  useEffect(() => {
    if (opponentPeerId && peerRef.current && localStreamRef.current) {
      const call = peerRef.current.call(opponentPeerId, localStreamRef.current);
      currentCallRef.current = call;
      if (call) {
        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });
      }
    }
  }, [opponentPeerId]);

  const toggleAudio = () => {
      if (!localStreamRef.current) return; 
      localStreamRef.current.getAudioTracks().forEach(track => { 
        track.enabled = !track.enabled; 
      });
    };
  
  return (
    <div className="video-section">
      <div className="video-container">
        <video ref={localVideoRef} id="localVideo" autoPlay muted playsInline />
        <video ref={remoteVideoRef} id="remoteVideo" autoPlay playsInline />
      </div>
      <div className="video-controls">
        <button id="startVideo">Start Video</button>
        <button id="toggleAudio" onClick={toggleAudio}>Mute</button>
      </div>
    </div>
  );
};

export default VideoCall;