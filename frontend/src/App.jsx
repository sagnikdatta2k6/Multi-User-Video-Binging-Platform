import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
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
  return (
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
  );
}

export default App;
