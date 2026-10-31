// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Showcase from './pages/Showcase';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { Sun, Home, Shield, User, LogOut } from 'lucide-react';

function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-amber-400">
          <Sun className="text-amber-400" /> Solar CRM
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link to="/" className="hover:text-amber-400 flex items-center gap-1">
            <Home size={18} /> Showcase
          </Link>
          
          <Link to="/admin" className="hover:text-amber-400 flex items-center gap-1 text-amber-400">
            <Shield size={18} /> Admin Panel
          </Link>

          {currentUser ? (
            <>
              <Link to="/dashboard" className="hover:text-amber-400 flex items-center gap-1">
                <User size={18} /> My Portal
              </Link>
              <button 
                onClick={handleLogout} 
                className="bg-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-red-700 transition"
              >
                <LogOut size={14} /> Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="bg-amber-500 text-slate-950 font-semibold px-4 py-1.5 rounded-lg hover:bg-amber-400 text-xs transition">
              Login / Register
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<Showcase />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}