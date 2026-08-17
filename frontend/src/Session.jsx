import { useEffect, useState, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import YouTube from 'react-youtube';
import { io } from 'socket.io-client';
import { motion } from 'framer-motion';
import { Users, Copy, Music, LogOut, Search, Send, MessageCircle } from 'lucide-react';
import { AuthContext } from './context/AuthContext';

const SOCKET_SERVER_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

const Session = () => {
  const { roomId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [socket, setSocket] = useState(null);
  const [users, setUsers] = useState([]);
  const [videoId, setVideoId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  
  const playerRef = useRef(null);
  const isSyncingRef = useRef(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    newSocket.emit('join_room', { 
      roomId, 
      username: user.username,
      profileImage: user.profileImage 
    });

    newSocket.on('room_state', (state) => {
      setUsers(state.users);
      if (state.playbackState.videoId) {
        setVideoId(state.playbackState.videoId);
      }
    });

    newSocket.on('user_joined', (newUser) => {
      setUsers((prev) => [...prev, newUser]);
    });

    newSocket.on('user_left', (leftUser) => {
      setUsers((prev) => prev.filter((u) => u.socketId !== leftUser.socketId));
    });

    newSocket.on('new_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('playback_synced', (state) => {
      if (!playerRef.current) return;
      const player = playerRef.current.getInternalPlayer();
      if (!player) return;

      isSyncingRef.current = true;

      if (state.videoId !== videoId) {
        setVideoId(state.videoId);
      }

      const currentTime = player.getCurrentTime() || 0;
      const timeDiff = Math.abs(currentTime - state.timestamp);

      if (timeDiff > 2) {
        player.seekTo(state.timestamp);
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

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, user]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const emitSync = async () => {
    if (isSyncingRef.current || !socket || !playerRef.current) return;
    const player = playerRef.current.getInternalPlayer();
    if (!player) return;

    const state = await player.getPlayerState();
    const isPlaying = state === 1;
    const timestamp = await player.getCurrentTime();

    socket.emit('sync_playback', {
      roomId,
      state: { videoId, isPlaying, timestamp }
    });
  };

  const onPlayerStateChange = (event) => {
    if (event.data === 1 || event.data === 2) {
      emitSync();
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchInput) return;

    let extractedId = searchInput;
    try {
      if (searchInput.includes('youtube.com') || searchInput.includes('youtu.be')) {
        const url = new URL(searchInput);
        if (url.hostname.includes('youtu.be')) {
          extractedId = url.pathname.slice(1);
        } else {
          extractedId = url.searchParams.get('v') || extractedId;
        }
      }
    } catch(e) {
      console.log('Invalid URL, treating as video ID');
    }

    setVideoId(extractedId);
    setSearchInput('');
    
    if (socket) {
      socket.emit('sync_playback', {
        roomId,
        state: { videoId: extractedId, isPlaying: true, timestamp: 0 }
      });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    
    socket.emit('send_message', { roomId, message: chatInput });
    setChatInput('');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert('Room ID copied to clipboard!');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', minHeight: '100vh', padding: '2rem', gap: '2rem', maxWidth: '1600px', margin: '0 auto' }}
    >
      {/* Left Column: Player & Queue */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header */}
        <div className="neo-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Music size={28} color="var(--accent-pink)" />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Room <span style={{ color: 'var(--accent-pink)' }}>#{roomId}</span></h2>
          </div>
          <button className="neo-button" onClick={copyRoomId} style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Copy size={16} /> Copy ID
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="neo-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            className="neo-input" 
            placeholder="Paste YouTube URL or Video ID to play..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="neo-button yellow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={20} />
          </button>
        </form>

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
            {users.map((u) => (
              <div key={u.socketId} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {u.profileImage ? (
                  <img src={`http://localhost:3001${u.profileImage}`} alt="Profile" style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--border-color)', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-blue)', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {u.username.charAt(0).toUpperCase()}
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
                      <img src={`http://localhost:3001${msg.profileImage}`} alt="Profile" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                        {msg.username.charAt(0).toUpperCase()}
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

        <button className="neo-button" onClick={() => navigate('/')} style={{ marginTop: 'auto', background: '#ffcccc', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          <LogOut size={18} /> Leave Session
        </button>
      </div>
    </motion.div>
  );
};

export default Session;
