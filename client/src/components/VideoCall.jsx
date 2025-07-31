import React, { useEffect, useRef, useCallback, useState } from 'react';
import Peer from 'peerjs';

const VideoCall = ({ onPeerOpen, opponentPeerId }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const currentCallRef = useRef(null);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const initializeStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      stream.getVideoTracks().forEach(track => {
        track.enabled = false;
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setIsVideoOn(false);
      setIsAudioOn(false);
      
      return stream;
    } catch (err) {
      console.error('Failed to get local stream', err);
      return null;
    }
  }, []);

  const handleIncomingCall = useCallback((call) => {
    call.answer(localStreamRef.current);
    
    call.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    call.on('close', () => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      setIsConnected(false);
    });

    call.on('error', (err) => {
      console.error('Call error:', err);
      setIsConnected(false);
    });

    currentCallRef.current = call;
    setIsConnected(true);
  }, []);

  useEffect(() => {
    const initializePeer = async () => {
      await initializeStream();

      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
        { 
          urls: 'turn:numb.viagenie.ca',
          username: 'webrtc@live.com',
          credential: 'muazkh'
        },
      ];
      
      peerRef.current = new Peer(undefined, {
        host: 'localhost',
        port: 9000,
        path: '/',
        config: { iceServers },
      });

      peerRef.current.on('open', id => { 
        onPeerOpen(id);
      });
      
      peerRef.current.on('call', handleIncomingCall);

      peerRef.current.on('error', (err) => {
        console.error('Peer connection error:', err);
      });
    };

    initializePeer();

    return () => {
      if (currentCallRef.current) {
        currentCallRef.current.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, [onPeerOpen, handleIncomingCall, initializeStream]);

  useEffect(() => {
    if (opponentPeerId && peerRef.current && localStreamRef.current && !currentCallRef.current) {
      const call = peerRef.current.call(opponentPeerId, localStreamRef.current);
      
      if (call) {
        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });

        call.on('close', () => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          setIsConnected(false);
        });

        call.on('error', (err) => {
          console.error('Call error:', err);
          setIsConnected(false);
        });

        currentCallRef.current = call;
        setIsConnected(true);
      }
    }
  }, [opponentPeerId]);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOn(prev => !prev);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioOn(prev => !prev);
    }
  }, []);

  return (
    <div className="video-section">
      <div className="video-container">
        <video 
          ref={localVideoRef} 
          id="localVideo" 
          autoPlay 
          muted 
          playsInline 
          style={{ 
            backgroundColor: isVideoOn ? 'transparent' : '#374151',
            display: isVideoOn ? 'block' : 'block'
          }}
        />
        <video 
          ref={remoteVideoRef} 
          id="remoteVideo" 
          autoPlay 
          playsInline 
          style={{ backgroundColor: '#374151' }}
        />
      </div>
      <div className="video-controls">
        <button 
          onClick={toggleCamera}
          style={{ 
            backgroundColor: isVideoOn ? '#3B82F6' : '#EF4444' 
          }}
        >
          {isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
        </button>
        <button 
          onClick={toggleAudio}
          style={{ 
            backgroundColor: isAudioOn ? '#3B82F6' : '#EF4444' 
          }}
        >
          {isAudioOn ? 'Mute' : 'Unmute'}
        </button>
      </div>
      {!isConnected && (
        <div style={{ 
          textAlign: 'center', 
          marginTop: '8px', 
          fontSize: '12px', 
          color: '#9CA3AF' 
        }}>
          {opponentPeerId ? 'Connecting...' : 'Waiting for opponent...'}
        </div>
      )}
    </div>
  );
};

export default VideoCall;