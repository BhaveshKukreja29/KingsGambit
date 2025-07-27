import React, { useEffect, useRef, useCallback, useState } from 'react';
import Peer from 'peerjs';

const VideoCall = ({ onPeerOpen, opponentPeerId }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const currentCallRef = useRef(null);
  const [isStreamReady, setIsStreamReady] = useState(false);

  /**
   * Memoized handler for incoming calls.
   * This now answers a call immediately, allowing one-way video.
   */
  const handleIncomingCall = useCallback((call) => {
    // Answer the call, sending our local stream if it exists.
    call.answer(localStreamRef.current);
    
    // When we receive the opponent's stream, display it.
    call.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    // When the call is closed, clear the remote video element.
    call.on('close', () => {
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
    });

    currentCallRef.current = call;
  }, []);

  /**
   * Starts the user's local video stream.
   * Also handles upgrading a one-way call to a two-way call.
   */
  const startVideo = useCallback(async () => {
    try {
      if (localStreamRef.current) return; // Don't run if video is already on.

      // If we're already in a call, close it briefly to upgrade to two-way.
      if (currentCallRef.current) {
        currentCallRef.current.close();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsStreamReady(true);

      // Re-broadcast our peer ID to ensure the opponent can call us back.
      if (peerRef.current?.id) {
        onPeerOpen(peerRef.current.id);
      }
    } catch (err) {
      console.error('Failed to get local stream', err);
    }
  }, [onPeerOpen]);

  /**
   * Effect to initialize PeerJS and set up listeners.
   */
  useEffect(() => {
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

    peerRef.current.on('open', id => { onPeerOpen(id); });
    peerRef.current.on('call', handleIncomingCall);

    return () => {
      if (currentCallRef.current) currentCallRef.current.close();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
      if (peerRef.current) peerRef.current.destroy();
    };
  }, [onPeerOpen, handleIncomingCall]);

  /**
   * Effect to initiate a call from our side.
   */
  useEffect(() => {
    // Do not make a new call if one is already open.
    if (currentCallRef.current?.open) return;

    // Make a call only when the opponent is known and our video is ready.
    if (opponentPeerId && isStreamReady && peerRef.current && localStreamRef.current) {
      const call = peerRef.current.call(opponentPeerId, localStreamRef.current);
      if (call) {
        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });
        currentCallRef.current = call;
      }
    }
  }, [opponentPeerId, isStreamReady]);

  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  };

  return (
    <div className="video-section">
      <div className="video-container">
        <video ref={localVideoRef} id="localVideo" autoPlay muted playsInline />
        <video ref={remoteVideoRef} id="remoteVideo" autoPlay playsInline />
      </div>
      <div className="video-controls">
        <button onClick={startVideo}>Start Video</button>
        <button onClick={toggleAudio}>Mute</button>
      </div>
    </div>
  );
};

export default VideoCall;