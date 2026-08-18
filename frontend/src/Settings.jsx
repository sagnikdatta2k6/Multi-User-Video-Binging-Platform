import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContext } from './context/AuthContext';
import { Save, ArrowLeft, Upload } from 'lucide-react';

const Settings = () => {
  const { user, updateProfile } = useContext(AuthContext);
  const [username, setUsername] = useState(user?.username || '');
  const [file, setFile] = useState(null);
  const backendUrl = import.meta.env.PROD ? '' : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001');
  
  const getInitialPreview = () => {
    if (!user?.profileImage) return null;
    return user.profileImage.startsWith('data:image') ? user.profileImage : `${backendUrl}${user.profileImage}`;
  };
  
  const [preview, setPreview] = useState(getInitialPreview());
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Saving...');
    try {
      const formData = new FormData();
      formData.append('username', username);
      if (file) {
        formData.append('profileImage', file);
      }
      await updateProfile(formData);
      setStatus('Profile updated successfully!');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setStatus('Error updating profile');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
    >
      <button onClick={() => navigate('/')} className="neo-button" style={{ background: 'white', alignSelf: 'flex-start', marginBottom: '2rem', display: 'flex', gap: '0.5rem', padding: '8px 16px' }}>
        <ArrowLeft size={20} /> Back
      </button>

      <motion.div className="neo-panel" style={{ padding: '3rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Profile Settings</h2>
        
        {status && <div style={{ marginBottom: '1rem', fontWeight: 'bold', padding: '1rem', background: status.includes('Error') ? '#ffcccc' : '#d4edda', border: '2px solid var(--border-color)', borderRadius: '8px' }}>{status}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: '3px solid var(--border-color)', overflow: 'hidden', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {preview ? (
                <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{username.charAt(0).toUpperCase()}</span>
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <label className="neo-label">Profile Image</label>
              <input type="file" id="avatar" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              <label htmlFor="avatar" className="neo-button yellow" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer', padding: '8px 16px', fontSize: '0.9rem' }}>
                <Upload size={16} /> Choose Image
              </label>
            </div>
          </div>

          <div>
            <label className="neo-label">Display Name</label>
            <input type="text" className="neo-input" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>

          <button type="submit" className="neo-button green" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <Save size={20} /> Save Changes
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default Settings;
