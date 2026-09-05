import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  ShieldAlert, User, Briefcase, Building2, Radio, BarChart3, 
  Volume2, VolumeX, AlertTriangle, LogIn, LogOut, ChevronDown, 
  ExternalLink, Sparkles 
} from 'lucide-react';

export default function Header({
  onTriggerSos,
  soundEnabled,
  onToggleSound,
  wsConnected
}) {
  const { currentUser, isAuthenticated, logout, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const handleSosClick = () => {
    if (confirm('TRIGGER EMERGENCY SOS DISPATCH?\n\nThis will broadcast a P1 Critical emergency alert to CAD response units with your GPS location.')) {
      onTriggerSos();
    }
  };

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };

  const roles = [
    { id: 'citizen', label: 'Citizen Portal', path: '/citizen/dashboard', icon: User, badge: 'Public' },
    { id: 'officer', label: 'Officer Field Desk', path: '/officer/dashboard', icon: Briefcase, badge: 'Field' },
    { id: 'department_admin', label: 'Department Console', path: '/department/dashboard', icon: Building2, badge: 'Supervisor' },
    { id: 'ert_responder', label: 'Emergency CAD Board', path: '/emergency/dashboard', icon: Radio, badge: 'CAD Board' },
    { id: 'admin', label: 'Admin Command Center', path: '/admin/dashboard', icon: BarChart3, badge: 'Executive' }
  ];

  const handleSelectRoleDemo = async (roleObj) => {
    setShowDemoMenu(false);
    await switchDemoRole(roleObj.id);
    navigate(roleObj.path);
  };

  const getDashboardPath = (role) => {
    if (role === 'officer') return '/officer/dashboard';
    if (role === 'department_admin') return '/department/dashboard';
    if (role === 'ert_responder') return '/emergency/dashboard';
    if (role === 'admin') return '/admin/dashboard';
    return '/citizen/dashboard';
  };

  const isPublicPage = ['/', '/about', '/services', '/how-it-works', '/emergency-help', '/login', '/register'].includes(location.pathname);

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Portal Identity */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-sm border border-sky-400/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-white">CIVIC<span className="text-sky-400">AI</span></span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Gov CAD
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Public Grievance & Emergency Response Platform</p>
            </div>
          </Link>

          {/* Center Navigation Links (Public / Operational) */}
          <nav className="hidden md:flex items-center space-x-1 text-xs font-medium text-slate-300">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-lg transition-all ${
                location.pathname === '/' ? 'bg-slate-800 text-white font-semibold' : 'hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Home
            </Link>
            <Link
              to="/services"
              className={`px-3 py-1.5 rounded-lg transition-all ${
                location.pathname === '/services' ? 'bg-slate-800 text-white font-semibold' : 'hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Services & SLAs
            </Link>
            <Link
              to="/how-it-works"
              className={`px-3 py-1.5 rounded-lg transition-all ${
                location.pathname === '/how-it-works' ? 'bg-slate-800 text-white font-semibold' : 'hover:text-white hover:bg-slate-800/60'
              }`}
            >
              How It Works
            </Link>
            <Link
              to="/emergency-help"
              className={`px-3 py-1.5 rounded-lg transition-all ${
                location.pathname === '/emergency-help' ? 'bg-slate-800 text-white font-semibold' : 'hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Helplines (112)
            </Link>
            {isAuthenticated && currentUser && (
              <Link
                to={getDashboardPath(currentUser.role)}
                className={`px-3 py-1.5 rounded-lg bg-sky-950 text-sky-300 border border-sky-800 font-semibold transition-all hover:bg-sky-900`}
              >
                My Workspace
              </Link>
            )}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-2.5">
            {/* 1-Click SOS Trigger */}
            <button
              onClick={handleSosClick}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-sm border border-red-400/30 transition-all active:scale-95"
              title="1-Click Emergency SOS Panic Beacon"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SOS (112)</span>
            </button>

            {/* Audio Siren Toggle */}
            <button
              onClick={onToggleSound}
              className={`p-2 rounded-lg border transition-all ${
                soundEnabled 
                  ? 'bg-slate-800 border-slate-700 text-sky-400' 
                  : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-400'
              }`}
              title={soundEnabled ? 'CAD Siren Audio Enabled' : 'CAD Siren Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* WebSocket Status Indicator */}
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[10px] font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className="text-slate-300">{wsConnected ? 'CAD LIVE' : 'SYNCING'}</span>
            </div>

            {/* Hackathon Demo Quick-Switch Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-all"
                title="Quick Perspective Switcher for Hackathon Evaluation"
              >
                <span className="hidden xl:inline text-[11px] text-sky-400">Demo:</span>
                <span className="text-[11px] capitalize">{currentUser?.role?.replace('_', ' ') || 'Switch Role'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showDemoMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 p-2 space-y-1">
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                    Switch Evaluator Perspective
                  </div>
                  {roles.map((r) => {
                    const Icon = r.icon;
                    const isSelected = currentUser?.role === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => handleSelectRoleDemo(r)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-all text-left ${
                          isSelected
                            ? 'bg-sky-600 text-white font-bold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Icon className="w-3.5 h-3.5" />
                          <span>{r.label}</span>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          isSelected ? 'bg-sky-700 text-sky-100' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {r.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User Account / Auth Section */}
            {isAuthenticated && currentUser ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-semibold text-white truncate max-w-[120px]">{currentUser.full_name}</div>
                  <div className="text-[10px] text-sky-400 uppercase font-mono">{currentUser.role}</div>
                </div>
                <button
                  onClick={handleLogoutClick}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-red-950/60 hover:text-red-300 border border-slate-700 text-slate-400 transition-all"
                  title="Log out of municipal session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-sm flex items-center space-x-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:inline-block px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
                >
                  Register
                </Link>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
