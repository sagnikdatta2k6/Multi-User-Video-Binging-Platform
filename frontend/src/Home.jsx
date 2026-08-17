import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlayCircle, Users, Settings } from 'lucide-react';
import { AuthContext } from './context/AuthContext';

const Home = () => {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const handleCreateSession = () => {
    const newRoomId = Math.random().toString(36).substring(2, 9);
    navigate(`/session/${newRoomId}`);
  };

  const handleJoinSession = () => {
    if (!roomId.trim()) return;
    navigate(`/session/${roomId}`);
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
      <div style={{ position: 'absolute', top: '2rem', right: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontWeight: 600 }}>Hey, {user?.username}!</span>
        {user?.profileImage ? (
          <img src={`http://localhost:3001${user.profileImage}`} alt="Profile" style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid var(--border-color)' }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-pink)', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {user?.username?.charAt(0).toUpperCase()}
          </div>
        )}
        <button className="neo-button blue" onClick={() => navigate('/settings')} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={18} /> Settings
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
          Listen<br/><span style={{ color: 'var(--accent-pink)' }}>Together</span>
        </h1>
        <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '2.5rem', color: '#555' }}>
          Sync YouTube music with your friends.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
          
          <button 
            className="neo-button green" 
            onClick={handleCreateSession}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '16px' }}
          >
            <PlayCircle size={24} />
            Start New Session
          </button>

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
    </motion.div>
  );
};

export default Home;
