// src/components/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sun, Shield, LayoutDashboard, LogOut, Globe } from 'lucide-react';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Define admin check (e.g., specific admin email or custom claim)
  const isAdmin = currentUser && (
    currentUser.email === 'admin@solar.com' || 
    currentUser.email?.startsWith('admin')
  );

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="p-2 bg-amber-500 text-slate-950 rounded-xl">
            <Sun size={20} />
          </div>
          <span>SunGrid <span className="text-amber-400">CRM</span></span>
        </Link>

        <div className="flex items-center gap-3 text-xs font-semibold">
          <Link to="/" className="px-3 py-2 rounded-lg hover:bg-slate-800 transition flex items-center gap-1">
            <Globe size={14} /> Showcase
          </Link>

          {currentUser ? (
            <>
              <Link to="/dashboard" className="px-3 py-2 rounded-lg hover:bg-slate-800 transition flex items-center gap-1">
                <LayoutDashboard size={14} /> My Portal
              </Link>

              {isAdmin && (
                <Link to="/admin" className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition flex items-center gap-1">
                  <Shield size={14} /> Admin Portal
                </Link>
              )}

              <button 
                onClick={handleLogout}
                className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-300 transition"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link to="/login" className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl font-bold transition">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}