import React, { useEffect, useRef } from 'react';
import Peer from 'peerjs';
import io from 'socket.io-client';
import './App.css';

const VideoCall = ({ roomId }) => {
  const socket = useRef(io());
  const peer = useRef(null);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const currentCall = useRef(null);
  const localStream = useRef(null);

  useEffect(() => {
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
        socket.current.emit('peer_id', { peerId: id, room: roomId });
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

    socket.current.on('peer_id', ({ peerId }) => {
      if (!peer.current || !localStream.current) return;
      const call = peer.current.call(peerId, localStream.current);
      call.on('stream', stream => {
        remoteVideo.current.srcObject = stream;
      });
    });

    return () => {
      if (peer.current) peer.current.destroy();
      socket.current.disconnect();
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