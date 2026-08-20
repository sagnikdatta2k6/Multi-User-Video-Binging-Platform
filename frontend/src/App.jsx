import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { AuthContext } from './context/AuthContext';
import Home from './Home';
import Session from './Session';
import Login from './Login';
import Signup from './Signup';
import Settings from './Settings';
import { AnimatePresence } from 'framer-motion';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return children;
};

function App() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/session/:roomId" element={
            <ProtectedRoute>
              <Session />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </AnimatePresence>
      
      <button 
        className="neo-button" 
        onClick={toggleTheme}
        style={{ 
          position: 'fixed', 
          bottom: '2rem', 
          left: '2rem', 
          zIndex: 9999, 
          padding: '12px', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: isDark ? '#444' : 'white',
          color: isDark ? 'white' : 'black'
        }}
        title="Toggle Dark Mode"
      >
        {isDark ? <Sun size={24} /> : <Moon size={24} />}
      </button>
    </>
  );
}

export default App;
