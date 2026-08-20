import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlayCircle, Users, Settings, LogOut } from 'lucide-react';
import { AuthContext } from './context/AuthContext';
import axios from './api/axios';

const Home = () => {
  const [roomId, setRoomId] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRoomName, setCreateRoomName] = useState('');
  
  // Join Modal States
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinPassword, setJoinPassword] = useState('');
  const [targetRoomId, setTargetRoomId] = useState('');
  const [isKnocking, setIsKnocking] = useState(false);
  const [knockStatus, setKnockStatus] = useState(''); // 'pending', 'allowed'

  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateSession = async () => {
    const newRoomId = Math.random().toString(36).substring(2, 9).toUpperCase();
    try {
      await axios.post('/room', {
        roomId: newRoomId,
        roomName: createRoomName || 'Unnamed Room',
        password: createPassword || null,
        hostId: user.id
      });
      navigate(`/session/${newRoomId}`);
    } catch (e) {
      console.error(e);
      alert('Failed to create room');
    }
  };

  const handleJoinSession = async () => {
    if (!roomId.trim()) return;
    const cleanRoomId = roomId.trim().toUpperCase();
    
    try {
      const res = await axios.get(`/room/${cleanRoomId}`);
      if (res.data.hasPassword) {
        setTargetRoomId(cleanRoomId);
        setJoinPassword('');
        setKnockStatus('');
        setShowJoinModal(true);
      } else {
        navigate(`/session/${cleanRoomId}`);
      }
    } catch (e) {
      console.error(e);
      alert('Room not found or server error');
    }
  };

  const handleSubmitPassword = async (e) => {
    e?.preventDefault();
    try {
      await axios.post(`/room/${targetRoomId}/verify`, { password: joinPassword });
      setShowJoinModal(false);
      navigate(`/session/${targetRoomId}`);
    } catch (e) {
      alert('Incorrect password!');
    }
  };

  const handleKnock = async () => {
    setIsKnocking(true);
    setKnockStatus('pending');
    try {
      await axios.post(`/room/${targetRoomId}/knock`, { userId: user.id, username: user.username });
      
      // Listen for the 'allowed' event on a temporary public channel
      import('pusher-js').then((PusherModule) => {
        const Pusher = PusherModule.default;
        const tempPusher = new Pusher(import.meta.env.VITE_PUSHER_KEY || 'ab1df4fde09d84c66e2c', {
          cluster: import.meta.env.VITE_PUSHER_CLUSTER || 'ap2'
        });
        
        const channel = tempPusher.subscribe(`knock-${targetRoomId}-${user.id}`);
        channel.bind('knock-allowed', () => {
          setKnockStatus('allowed');
          setTimeout(() => {
            tempPusher.disconnect();
            setShowJoinModal(false);
            navigate(`/session/${targetRoomId}`);
          }, 1000);
        });
      });
      
    } catch (e) {
      console.error(e);
      setKnockStatus('');
      alert('Failed to send knock request');
    } finally {
      setIsKnocking(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem'
      }}
    >
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '300px', zIndex: 10 }}>
        <span style={{ fontWeight: 600, maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Hey, {user?.username}!</span>
        {user?.profileImage ? (
          <img src={user.profileImage.startsWith('data:image') ? user.profileImage : `${import.meta.env.PROD ? '' : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001')}${user.profileImage}`} alt="Profile" style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid var(--border-color)' }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-pink)', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {user?.username?.charAt(0).toUpperCase()}
          </div>
        )}
        <button className="neo-button blue" onClick={() => navigate('/settings')} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={18} /> Settings
        </button>
        <button className="neo-button" onClick={handleLogout} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', background: '#ffcccc' }}>
          <LogOut size={18} /> Logout
        </button>
      </div>

      <motion.div 
        className="neo-panel"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 100, damping: 12 }}
        style={{
          padding: '3rem',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center'
        }}
      >
        <h1 className="neo-header-text" style={{ marginBottom: '1rem' }}>
          Binge<br/><span style={{ color: 'var(--accent-pink)' }}>Together</span>
        </h1>
        <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '2.5rem', color: '#555' }}>
          Sync your video binging together.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input 
              type="text" 
              className="neo-input" 
              placeholder="Room Name (Optional)" 
              value={createRoomName}
              onChange={(e) => setCreateRoomName(e.target.value)}
            />
            <input 
              type="text" 
              className="neo-input" 
              placeholder="Set Password (Optional)" 
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
            />
            <button 
              className="neo-button green" 
              onClick={handleCreateSession}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '16px' }}
            >
              <PlayCircle size={24} />
              Start New Session
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
            <div style={{ flex: 1, height: '2px', background: 'var(--border-color)' }}></div>
            <span style={{ fontWeight: 800 }}>OR</span>
            <div style={{ flex: 1, height: '2px', background: 'var(--border-color)' }}></div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              className="neo-input" 
              placeholder="Paste Room ID here..." 
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button 
              className="neo-button yellow" 
              onClick={handleJoinSession}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 20px' }}
            >
              <Users size={24} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Join Room Modal */}
      {showJoinModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div 
            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="neo-panel" 
            style={{ width: '400px', maxWidth: '90%', padding: '2rem', background: 'var(--bg-color)', textAlign: 'center' }}
          >
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 800 }}>Locked Room</h3>
            <p style={{ marginBottom: '1.5rem', color: '#555', fontWeight: 500 }}>
              Room <span style={{ color: 'var(--accent-pink)' }}>#{targetRoomId}</span> requires a password, or you can ask the Host to let you in.
            </p>
            
            {knockStatus === 'pending' ? (
              <div style={{ padding: '1rem', background: 'var(--accent-yellow)', borderRadius: '8px', fontWeight: 600 }}>
                Knocked! Waiting for host to approve...
              </div>
            ) : knockStatus === 'allowed' ? (
              <div style={{ padding: '1rem', background: 'var(--accent-green)', color: 'white', borderRadius: '8px', fontWeight: 600 }}>
                Host approved! Joining...
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmitPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input 
                    type="text" 
                    className="neo-input" 
                    placeholder="Enter Password" 
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="neo-button green" style={{ width: '100%', padding: '12px' }}>
                    Join with Password
                  </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
                  <div style={{ flex: 1, height: '2px', background: 'var(--border-color)' }}></div>
                  <span style={{ fontWeight: 800 }}>OR</span>
                  <div style={{ flex: 1, height: '2px', background: 'var(--border-color)' }}></div>
                </div>

                <button 
                  className="neo-button blue" 
                  onClick={handleKnock}
                  disabled={isKnocking}
                  style={{ width: '100%', padding: '12px' }}
                >
                  {isKnocking ? 'Knocking...' : 'Knock (Ask to Join)'}
                </button>
              </>
            )}

            <button 
              onClick={() => { setShowJoinModal(false); setKnockStatus(''); }}
              style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default Home;
