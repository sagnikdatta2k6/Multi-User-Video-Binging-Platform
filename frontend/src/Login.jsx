import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContext } from './context/AuthContext';
import { LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}
    >
      <motion.div className="neo-panel" style={{ padding: '3rem', maxWidth: '400px', width: '100%' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>Welcome Back</h2>
        {error && <div style={{ color: 'red', marginBottom: '1rem', fontWeight: 'bold' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="neo-label">Email</label>
            <input type="email" required className="neo-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="neo-label">Password</label>
            <input type="password" required className="neo-input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="neo-button blue" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <LogIn size={20} /> Login
          </button>
        </form>
        <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          Don't have an account? <Link to="/signup" style={{ color: 'var(--accent-blue)', fontWeight: 'bold', textDecoration: 'none' }}>Sign up</Link>
        </p>
      </motion.div>
    </motion.div>
  );
};

export default Login;
