import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import PublicHome from './views/PublicHome.jsx';
import { AboutPage, ServicesPage, HowItWorksPage, EmergencyHelpPage } from './views/PublicPages.jsx';
import { LoginPage, RegisterPage } from './views/AuthPages.jsx';
import CitizenPortal from './views/CitizenPortal.jsx';
import OfficerWorkspace from './views/OfficerWorkspace.jsx';
import DepartmentConsole from './views/DepartmentConsole.jsx';
import EmergencyCADBoard from './views/EmergencyCADBoard.jsx';
import AdminAnalytics from './views/AdminAnalytics.jsx';
import { useAuth } from './context/AuthContext.jsx';

export default function App() {
  const { currentUser, authFetch, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  const [toasts, setToasts] = useState([]);
  
  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Synthetic Web Audio CAD Siren
  const playSiren = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      // Emergency alternating pitch
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.3);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.6);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.9);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.warn('Audio playback not permitted yet by browser gesture', e);
    }
  };

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Instant 1-Click SOS Trigger
  const handleTriggerSos = async () => {
    try {
      const res = await authFetch('/api/v1/emergency/sos', {
        method: 'POST',
        body: JSON.stringify({
          latitude: 19.0760,
          longitude: 72.8777,
          emergency_type: 'PANIC_BUTTON',
          contact_phone: currentUser?.phone || '+91 98765 43210',
          battery_level: 84
        })
      });
      if (res.ok) {
        const data = await res.json();
        playSiren();
        addToast(`🚨 SOS BROADCAST ACTIVE: ${data.incident_code}! Nearest emergency responders alerted.`, 'error');
        setEmergencyAlert(data);
      }
    } catch {
      addToast('Emergency SOS signal delivery failed', 'error');
    }
  };

  // Connect WebSocket to backend CAD channel
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/cad`;
    
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === 'SOS_CRITICAL_ALERT') {
            playSiren();
            addToast(`🚨 P1 CRITICAL SOS: ${payload.data.incident_code} at ${payload.data.latitude.toFixed(4)}, ${payload.data.longitude.toFixed(4)}!`, 'error');
            setEmergencyAlert(payload.data);
          } else if (payload.event === 'UNIT_DISPATCHED') {
            addToast(`Fleet Unit ${payload.data.unit_callsign} dispatched to scene (Status: EN_ROUTE)`, 'success');
          }
        } catch {}
      };

      ws.onclose = () => {
        setWsConnected(false);
      };
    } catch (e) {
      console.warn('WebSocket connection error:', e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [soundEnabled]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Universal Header with Navigation & Role Switcher */}
      <Header
        onTriggerSos={handleTriggerSos}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        wsConnected={wsConnected}
      />

      {/* Main Content Router */}
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicHome onTriggerSos={handleTriggerSos} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/emergency-help" element={<EmergencyHelpPage onTriggerSos={handleTriggerSos} />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/:role" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes (Role-Specific) */}
          <Route
            path="/citizen/*"
            element={
              <ProtectedRoute allowedRoles={['citizen', 'admin']}>
                <CitizenPortal onTriggerSos={handleTriggerSos} onNotify={addToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/*"
            element={
              <ProtectedRoute allowedRoles={['officer', 'admin']}>
                <OfficerWorkspace onNotify={addToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/department/*"
            element={
              <ProtectedRoute allowedRoles={['department_admin', 'admin']}>
                <DepartmentConsole onNotify={addToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/emergency/*"
            element={
              <ProtectedRoute allowedRoles={['ert_responder', 'admin']}>
                <EmergencyCADBoard onNotify={addToast} emergencyAlert={emergencyAlert} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAnalytics onNotify={addToast} />
              </ProtectedRoute>
            }
          />

          {/* Fallback to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Official Municipal Footer */}
      <footer className="border-t border-slate-800 bg-slate-900 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-slate-200">Enterprise AI Civic Service Desk & Emergency CAD Platform</span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Public Grievance Redressal • PostGIS Spatial Routing • Computer-Aided Dispatch • SLA Enforcement
            </p>
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <a href="/emergency-help" className="text-slate-400 hover:text-white">Emergency Helplines</a>
            <a href="/services" className="text-slate-400 hover:text-white">Citizen Charters</a>
            <a href="/how-it-works" className="text-slate-400 hover:text-white">How It Works</a>
            <span className="font-mono text-slate-600">v1.0.0-PROD</span>
          </div>
        </div>
      </footer>

      {/* Global Notification Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-3.5 rounded-xl shadow-xl border pointer-events-auto text-xs font-semibold flex items-center justify-between transition-all ${
              t.type === 'error'
                ? 'bg-red-950/95 border-red-500 text-red-200'
                : t.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500 text-emerald-200'
                : 'bg-slate-900/95 border-sky-500 text-sky-200'
            }`}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
