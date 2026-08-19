import { useEffect, useState, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import YouTube from 'react-youtube';
import Pusher from 'pusher-js';
import { motion } from 'framer-motion';
import { Users, Copy, Music, LogOut, Search, Send, MessageCircle, Monitor, Settings, X, Check } from 'lucide-react';
import axios from './api/axios';
import Peer from 'peerjs';
import { AuthContext } from './context/AuthContext';

const BACKEND_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001');

const Session = () => {
  const { roomId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [channel, setChannel] = useState(null);
  const [users, setUsers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  
  const [videoIdState, setVideoIdState] = useState('');
  const [iframeUrl, setIframeUrl] = useState('');
  const videoIdRef = useRef('');
  
  const setVideoId = (id) => {
    if (typeof id === 'function') {
      setVideoIdState(prev => {
        const next = id(prev);
        videoIdRef.current = next;
        return next;
      });
    } else {
      setVideoIdState(id);
      videoIdRef.current = id;
    }
  };
  const videoId = videoIdState;

  const [searchInput, setSearchInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  
  const [peerId, setPeerId] = useState('');
  const [remoteStream, setRemoteStream] = useState(null);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  const [pendingKnocks, setPendingKnocks] = useState([]);
  
  const playerRef = useRef(null);
  const isSyncingRef = useRef(false);
  const chatBottomRef = useRef(null);
  
  const peerRef = useRef(null);
  const myScreenStreamRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  const usersRef = useRef([]);

  useEffect(() => {
    if (!user) return;
    
    // Check room host
    const checkRoom = async () => {
      try {
        const res = await axios.get(`/room/${roomId}`);
        if (res.data.hostId === user.id) {
          setIsHost(true);
        }
      } catch (err) {
        console.error('Failed to fetch room details', err);
      } finally {
        setIsLoadingRoom(false);
      }
    };
    
    checkRoom();
    
    // Make sure we have Pusher config
    const pusherKey = import.meta.env.VITE_PUSHER_KEY || 'app-key';
    const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER || 'us2';

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
      channelAuthorization: {
        endpoint: `${BACKEND_URL}/api/pusher/auth`,
        params: {
          user_id: user.id || user.username,
          username: user.username,
          profileImage: user.profileImage
        }
      }
    });

    const roomChannelName = `presence-room-${roomId}`;
    const roomChannel = pusher.subscribe(roomChannelName);
    setChannel(roomChannel);

    const triggerServerEvent = (eventName, data) => {
      axios.post('/pusher/trigger', {
        channel: roomChannelName,
        event: eventName,
        data: data
      }).catch(err => console.error('Trigger failed', err));
    };

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', id => {
      setPeerId(id);
    });

    peer.on('call', call => {
      if (myScreenStreamRef.current) {
        call.answer(myScreenStreamRef.current);
      } else {
        call.answer();
      }
      
      call.on('stream', stream => {
        setRemoteStream(stream);
        setTimeout(() => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
        }, 100);
      });
    });

    // Initial join / members list load
    roomChannel.bind('pusher:subscription_succeeded', (members) => {
      // members.members is an object where keys are user_ids and values are user_info
      const initialUsers = [];
      members.each(member => {
        initialUsers.push({
          socketId: member.id, // we map user_id to socketId for UI compatibility
          username: member.info.username,
          profileImage: member.info.profileImage
        });
      });
      setUsers(initialUsers);
      
      // Since we just joined, we don't know the video state. 
      // Ask the room for a video sync!
      triggerServerEvent('server-request-video-sync', {});
    });

    // When someone else joins
    roomChannel.bind('pusher:member_added', (member) => {
      setUsers(prev => {
        const list = prev || [];
        const filtered = list.filter(u => u.username !== member.info.username);
        return [...filtered, {
          socketId: member.id,
          username: member.info.username,
          profileImage: member.info.profileImage
        }];
      });
    });

    // When someone leaves (closes tab, loses internet)
    roomChannel.bind('pusher:member_removed', (member) => {
      setUsers(prev => {
        const list = prev || [];
        return list.filter(u => u.username !== member.info.username);
      });
    });

    roomChannel.bind('pusher:subscription_error', (err) => {
      alert('Failed to connect to the room (Real-time Auth Error). Please check if Pusher credentials are correct.');
    });

    pusher.connection.bind('error', (err) => {
      if (err.error && err.error.data && err.error.data.code === 4004) {
        alert('Pusher Error: Over limit!');
      } else {
        console.error('Pusher error', err);
      }
    });

    // Someone just joined and is requesting the current video state
    roomChannel.bind('server-request-video-sync', () => {
      if (videoIdRef.current) {
        const sendVideoState = (playbackState) => {
          triggerServerEvent('server-room-state-video-only', playbackState);
        };
        
        try {
          if (playerRef.current && videoIdRef.current) {
            const player = playerRef.current.getInternalPlayer();
            if (player && typeof player.getPlayerState === 'function') {
               player.getPlayerState().then(state => {
                 player.getCurrentTime().then(timestamp => {
                   sendVideoState({ videoId: videoIdRef.current, iframeUrl: '', isPlaying: state === 1, timestamp });
                 }).catch(() => sendVideoState({ videoId: videoIdRef.current, iframeUrl: '', isPlaying: false, timestamp: 0 }));
               }).catch(() => sendVideoState({ videoId: videoIdRef.current, iframeUrl: '', isPlaying: false, timestamp: 0 }));
               return;
            }
          }
        } catch(e) {}
        
        sendVideoState({ videoId: videoIdRef.current, iframeUrl, isPlaying: false, timestamp: 0 });
      }
    });

    // When someone explicitly syncs video state
    roomChannel.bind('server-room-state-video-only', (playbackState) => {
      if (playbackState.videoId && !videoIdRef.current) {
        setVideoId(playbackState.videoId);
        setIframeUrl('');
      } else if (playbackState.iframeUrl) {
        setIframeUrl(playbackState.iframeUrl);
        setVideoId('');
      }
    });

    // Chat message received
    roomChannel.bind('server-new-message', (message) => {
      setMessages((prev) => [...prev, message]);
    });
    
    // Screen share started by someone else
    roomChannel.bind('server-screen-share-started', (data) => {
      if (data.peerId && peerRef.current) {
        const call = peerRef.current.call(data.peerId);
        if (call) {
          call.on('stream', stream => {
            setRemoteStream(stream);
            setTimeout(() => {
              if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
            }, 100);
          });
        }
      }
    });

    // Screen share stopped
    roomChannel.bind('server-screen-share-stopped', () => {
      setRemoteStream(null);
    });

    // Playback sync received
    roomChannel.bind('server-playback-synced', (state) => {
      if (state.iframeUrl) {
        setIframeUrl(state.iframeUrl);
        setVideoId('');
        return;
      }
      
      // ALWAYS set the video ID first, even if the player hasn't mounted yet
      setVideoId(state.videoId);
      setIframeUrl('');

      if (!playerRef.current) return;
      const player = playerRef.current.getInternalPlayer();
      if (!player || typeof player.seekTo !== 'function') return;

      isSyncingRef.current = true;

      player.getCurrentTime().then(currentTime => {
        const timeDiff = Math.abs((currentTime || 0) - state.timestamp);
        if (timeDiff > 2) {
          player.seekTo(state.timestamp, true);
        }

        if (state.isPlaying) {
          player.playVideo();
        } else {
          player.pauseVideo();
        }

        setTimeout(() => {
          isSyncingRef.current = false;
        }, 500);
      });
    });

    // Listen for knocks (Host only handles this, but everyone receives it on presence channel)
    roomChannel.bind('guest-knock', (data) => {
      setPendingKnocks(prev => {
        // Prevent duplicate knocks
        if (prev.find(k => k.userId === data.userId)) return prev;
        return [...prev, data];
      });
    });

    return () => {
      pusher.unsubscribe(`presence-room-${roomId}`);
      pusher.disconnect();
      if (peerRef.current) peerRef.current.destroy();
    };
  }, [roomId, user]); // Note: depending on videoId here causes re-subscriptions, so we use refs/state carefully

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const emitSync = async () => {
    if (isSyncingRef.current || !channel || !playerRef.current) return;
    const player = playerRef.current.getInternalPlayer();
    if (!player) return;

    const state = await player.getPlayerState();
    const isPlaying = state === 1;
    const timestamp = await player.getCurrentTime();

    // We can use the same axios post function here
    axios.post('/pusher/trigger', {
      channel: `presence-room-${roomId}`,
      event: 'server-playback-synced',
      data: { videoId, iframeUrl: '', isPlaying, timestamp }
    }).catch(console.error);
  };

  const onPlayerStateChange = (event) => {
    if (event.data === 1 || event.data === 2) {
      emitSync();
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchInput) return;

    let isYouTube = false;
    let extractedId = searchInput;
    
    try {
      if (searchInput.includes('youtube.com') || searchInput.includes('youtu.be')) {
        isYouTube = true;
        const url = new URL(searchInput);
        if (url.hostname.includes('youtu.be')) {
          extractedId = url.pathname.slice(1);
        } else if (url.pathname.includes('/shorts/')) {
          extractedId = url.pathname.split('/shorts/')[1].split('?')[0];
        } else {
          extractedId = url.searchParams.get('v') || extractedId;
        }
      } else if (!searchInput.startsWith('http://') && !searchInput.startsWith('https://')) {
        // Assume it's a direct YouTube ID if it's not a URL
        isYouTube = true;
      }
    } catch(e) {
      console.log('Invalid URL, treating as video ID');
      isYouTube = true;
    }

    if (isYouTube) {
      setVideoId(extractedId);
      setIframeUrl('');
    } else {
      setIframeUrl(searchInput);
      setVideoId('');
    }
    
    setSearchInput('');
    
    if (channel) {
      axios.post('/pusher/trigger', {
        channel: `presence-room-${roomId}`,
        event: 'server-playback-synced',
        data: { 
          videoId: isYouTube ? extractedId : '', 
          iframeUrl: isYouTube ? '' : searchInput,
          isPlaying: true, 
          timestamp: 0 
        }
      }).catch(console.error);
    }
  };

  const handleShareScreen = async () => {
    try {
      if (isSharingScreen) {
        // Stop sharing
        if (myScreenStreamRef.current) {
          myScreenStreamRef.current.getTracks().forEach(t => t.stop());
        }
        setIsSharingScreen(false);
        myScreenStreamRef.current = null;
        axios.post('/pusher/trigger', {
          channel: `presence-room-${roomId}`,
          event: 'server-screen-share-stopped',
          data: {}
        }).catch(console.error);
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      myScreenStreamRef.current = stream;
      setIsSharingScreen(true);
      
      stream.getVideoTracks()[0].onended = () => {
        setIsSharingScreen(false);
        myScreenStreamRef.current = null;
        axios.post('/pusher/trigger', {
          channel: `presence-room-${roomId}`,
          event: 'server-screen-share-stopped',
          data: {}
        }).catch(console.error);
      };

      axios.post('/pusher/trigger', {
        channel: `presence-room-${roomId}`,
        event: 'server-screen-share-started',
        data: { peerId }
      }).catch(console.error);
    } catch (e) {
      console.error('Screen share failed', e);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !channel) return;
    
    const chatMessage = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      text: chatInput,
      username: user.username,
      profileImage: user.profileImage,
      timestamp: Date.now()
    };

    // Add to our own state instantly
    setMessages(prev => [...prev, chatMessage]);
    
    // Broadcast to others via backend
    axios.post('/pusher/trigger', {
      channel: `presence-room-${roomId}`,
      event: 'server-new-message',
      data: chatMessage
    }).catch(console.error);
    
    setChatInput('');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert('Room ID copied to clipboard!');
  };
  
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    try {
      await axios.put(`/room/${roomId}/password`, { password: newPassword || null });
      alert('Password updated successfully!');
      setShowSettings(false);
      setNewPassword('');
    } catch (e) {
      console.error(e);
      alert('Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleAllowKnock = async (targetUserId) => {
    try {
      await axios.post(`/room/${roomId}/allow`, { targetUserId });
      setPendingKnocks(prev => prev.filter(k => k.userId !== targetUserId));
    } catch (e) {
      console.error('Failed to allow user', e);
    }
  };

  const renderProfileImage = (imgSrc) => {
    if (!imgSrc) return null;
    return imgSrc.startsWith('data:image') ? imgSrc : `${BACKEND_URL}${imgSrc}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', minHeight: '100vh', padding: '2rem', gap: '2rem', maxWidth: '1600px', margin: '0 auto' }}
    >
      {/* Left Column: Player & Queue */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header */}
        <div className="neo-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Music size={28} color="var(--accent-pink)" />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Room <span style={{ color: 'var(--accent-pink)' }}>#{roomId}</span></h2>
            {isHost && <span style={{ background: 'var(--accent-blue)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>HOST</span>}
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {isHost && (
              <>
                <button type="button" className="neo-button" onClick={() => setShowSettings(true)} style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent-green)', color: 'white' }}>
                  <Settings size={16} /> Settings
                </button>
                <button type="button" className={`neo-button ${isSharingScreen ? 'red' : 'blue'}`} onClick={handleShareScreen} style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', background: isSharingScreen ? '#ffcccc' : '' }} title={isSharingScreen ? "Stop Sharing" : "Share Screen"}>
                  <Monitor size={16} /> {isSharingScreen ? "Stop Sharing" : "Share Screen"}
                </button>
              </>
            )}
            <button className="neo-button" onClick={copyRoomId} style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Copy size={16} /> Copy ID
            </button>
          </div>
        </div>

        {/* Search Input (Host Only) */}
        {!isLoadingRoom && isHost && (
          <form onSubmit={handleSearch} className="neo-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem' }}>
            <input 
              type="text" 
              className="neo-input" 
              placeholder="Paste YouTube URL, Video ID, or any Website URL..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="neo-button yellow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={20} />
            </button>
          </form>
        )}

        {/* Screen Share Container */}
        {remoteStream && (
          <div className="neo-panel" style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: '#000', marginBottom: '1rem', border: '4px solid var(--accent-blue)' }}>
            <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: '4px', zIndex: 10, fontSize: '0.8rem', fontWeight: 'bold' }}>Live Screen Share</div>
            <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        )}

        {/* Player Container */}
        <div className="neo-panel" style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: '#000' }}>
          {videoId ? (
             <YouTube
              videoId={videoId}
              ref={playerRef}
              opts={{
                width: '100%',
                height: '100%',
                playerVars: { autoplay: 1, controls: 1, modestbranding: 1 },
              }}
              onStateChange={onPlayerStateChange}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          ) : iframeUrl ? (
            <iframe 
              src={iframeUrl} 
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title="Embedded Content"
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#666' }}>
              <Music size={64} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p style={{ fontWeight: 600 }}>Queue a song to start listening</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Chat & Users */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: '350px' }}>
        
        {/* User List */}
        <div className="neo-panel" style={{ padding: '1.5rem', maxHeight: '250px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 800 }}>
            <Users size={20} /> Listeners ({users.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {users.map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {u.profileImage ? (
                  <img src={renderProfileImage(u.profileImage)} alt="Profile" style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--border-color)', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-blue)', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {u.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <span style={{ fontWeight: 600 }}>{u.username} {u.username === user?.username ? '(You)' : ''}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Chat */}
        <div className="neo-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', minHeight: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 800 }}>
            <MessageCircle size={20} /> Live Chat
          </div>
          
          {/* Messages Area */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem', marginBottom: '1rem' }}>
            {messages.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#888', marginTop: '2rem' }}>No messages yet. Say hi!</p>
            ) : (
              messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {msg.profileImage ? (
                      <img src={renderProfileImage(msg.profileImage)} alt="Profile" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                        {msg.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{msg.username}</span>
                    <span style={{ fontSize: '0.75rem', color: '#666' }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ background: msg.username === user?.username ? 'var(--accent-blue)' : '#f0f0f0', border: '2px solid var(--border-color)', borderRadius: '12px', padding: '8px 12px', fontSize: '0.95rem', alignSelf: 'flex-start', maxWidth: '90%' }}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              className="neo-input" 
              placeholder="Type a message..." 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="neo-button green" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
              <Send size={18} />
            </button>
          </form>
        </div>

        <button className="neo-button" onClick={() => navigate('/', { replace: true })} style={{ marginTop: 'auto', background: '#ffcccc', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          <LogOut size={18} /> Leave Session
        </button>
      </div>

      {/* Host Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              className="neo-panel" 
              style={{ width: '400px', maxWidth: '90%', padding: '2rem', background: 'var(--bg-color)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Room Settings</h3>
                <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Change Room Password</label>
                  <input 
                    type="text" 
                    className="neo-input" 
                    placeholder="Leave blank to remove password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className="neo-button green" disabled={isUpdatingPassword} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Check size={18} /> {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Pending Knocks Panel for Host */}
      {isHost && pendingKnocks.length > 0 && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 900, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pendingKnocks.map(knock => (
            <motion.div 
              key={knock.userId}
              initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 50, opacity: 0 }}
              className="neo-panel"
              style={{ padding: '1rem', background: 'var(--bg-color)', borderLeft: '4px solid var(--accent-yellow)', display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '250px' }}
            >
              <span style={{ fontWeight: 600 }}>{knock.username} wants to join</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="neo-button green" 
                  onClick={() => handleAllowKnock(knock.userId)}
                  style={{ padding: '4px 8px', fontSize: '0.8rem', flex: 1 }}
                >
                  Allow
                </button>
                <button 
                  className="neo-button red" 
                  onClick={() => setPendingKnocks(prev => prev.filter(k => k.userId !== knock.userId))}
                  style={{ padding: '4px 8px', fontSize: '0.8rem', flex: 1 }}
                >
                  Deny
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default Session;
