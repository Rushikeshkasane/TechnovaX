import React, { useState, useEffect } from 'react';
import { 
  Radio, AlertTriangle, Navigation, Phone, Battery, 
  ShieldAlert, CheckCircle2, Siren, ArrowRight, Truck, RefreshCw 
} from 'lucide-react';
import GisMap from '../components/GisMap.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function EmergencyCADBoard({ onNotify, emergencyAlert }) {
  const { currentUser, authFetch } = useAuth();

  const [incidents, setIncidents] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [dispatching, setDispatching] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCadData = async () => {
    try {
      const incRes = await authFetch('/api/v1/emergency/cad/active');
      const unitRes = await authFetch('/api/v1/emergency/units');
      if (incRes.ok && unitRes.ok) {
        const incData = await incRes.json();
        const unitData = await unitRes.json();
        setIncidents(incData);
        setUnits(unitData);
        if (incData.length > 0 && !selectedIncident) {
          setSelectedIncident(incData[0]);
        } else if (selectedIncident) {
          const updated = incData.find(i => i.id === selectedIncident.id);
          if (updated) setSelectedIncident(updated);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCadData();
    const interval = setInterval(fetchCadData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (emergencyAlert) {
      fetchCadData();
    }
  }, [emergencyAlert]);

  const handleDispatch = async (incidentId, unitId) => {
    setDispatching(true);
    try {
      const dispatcherName = currentUser?.full_name || 'CAD Dispatcher';
      const res = await authFetch(`/api/v1/emergency/cad/${incidentId}/dispatch`, {
        method: 'POST',
        body: JSON.stringify({
          unit_id: unitId,
          notes: `CAD High-Priority Dispatch by ${dispatcherName}`
        })
      });
      if (res.ok) {
        onNotify('Unit successfully dispatched! Status: EN_ROUTE (10-76)', 'success');
        fetchCadData();
      } else {
        const err = await res.json();
        onNotify(err.detail || 'Dispatch command failed', 'error');
      }
    } catch {
      onNotify('Dispatch command failed', 'error');
    } finally {
      setDispatching(false);
    }
  };

  const handleCloseIncident = async (incidentId) => {
    if (!confirm('Mark emergency scene contained and release response units to AVAILABLE?')) return;
    try {
      const res = await authFetch(`/api/v1/emergency/cad/${incidentId}/close`, {
        method: 'POST'
      });
      if (res.ok) {
        onNotify('Incident marked CONTAINED. Scene cleared (10-98).', 'success');
        setSelectedIncident(null);
        fetchCadData();
      }
    } catch {
      onNotify('Failed to close incident', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* CAD Dispatch Console Header */}
      <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-white">
                Computer-Aided Dispatch (CAD) Console
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-mono text-[10px] border border-red-500/30 font-semibold">
                911 / 112 DISPATCH
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Commander: <strong className="text-slate-200">{currentUser?.full_name || 'Commander Vikram Singh'}</strong> • High-Velocity Incident Queue
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono">
            Active Incidents: <strong className="text-red-400">{incidents.length}</strong>
          </div>
          <button
            onClick={fetchCadData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            title="Refresh CAD Queue"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fleet Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {units.map((u) => {
          const isAvail = u.status === 'AVAILABLE';
          return (
            <div key={u.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase">{u.unit_type}</span>
                <div className="text-xs font-bold text-white truncate max-w-[120px]">{u.unit_callsign}</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                isAvail
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                  : 'bg-amber-950/60 text-amber-300 border-amber-800'
              }`}>
                {u.status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main CAD Split Board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Incident Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Live 911 / 112 Incident Feed</h3>
            <span className="text-[11px] font-mono text-slate-500">Auto-refresh 5s</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Connecting to CAD channel...</div>
          ) : incidents.length === 0 ? (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">Zero Active CAD Incidents</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No active 911/112 emergency calls in queue. Response fleet standing by.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1 scrollbar-thin">
              {incidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                const isP1 = inc.priority === 'P1_CRITICAL';
                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-red-500 shadow-md'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-red-400">{inc.incident_code}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        isP1 ? 'bg-red-950/60 text-red-300 border-red-800' : 'bg-amber-950/60 text-amber-300 border-amber-800'
                      }`}>
                        {inc.priority}
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-white line-clamp-1">{inc.emergency_type}</div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">{inc.address_text}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-slate-800">
                      <span>Phone: <strong className="text-slate-300 font-mono">{inc.contact_phone}</strong></span>
                      <span className="font-mono text-slate-400">{new Date(inc.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CAD Detail & Proximity Dispatch */}
        <div className="lg:col-span-7 bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
          {selectedIncident ? (
            <>
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-red-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-700">
                      {selectedIncident.incident_code}
                    </span>
                    <span className="text-xs font-semibold text-white uppercase">{selectedIncident.emergency_type}</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1.5">{selectedIncident.address_text}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Caller Telemetry: Phone <span className="font-mono text-slate-200">{selectedIncident.contact_phone}</span> • Battery Level: <span className="font-mono text-slate-200">{selectedIncident.battery_level}%</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-red-300 border border-slate-700">
                    {selectedIncident.status}
                  </span>
                  <div className="text-[11px] font-mono text-slate-500 mt-1.5">
                    Triggered: {new Date(selectedIncident.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Nearest Units Available for Dispatch */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Proximity-Sorted Response Units (Haversine ETA)
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">Closest unit first</span>
                </div>

                <div className="space-y-2">
                  {selectedIncident.nearest_units?.map((nu) => (
                    <div
                      key={nu.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{nu.unit_callsign}</div>
                          <div className="text-[11px] text-slate-400">
                            {nu.unit_type} • Status: <span className="font-mono text-slate-300">{nu.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right text-xs">
                          <span className="font-mono font-bold text-sky-400">{(nu.distance_meters / 1000).toFixed(1)} km</span>
                          <span className="text-slate-500 block text-[10px]">ETA: ~{nu.eta_minutes.toFixed(0)} min</span>
                        </div>
                        <button
                          onClick={() => handleDispatch(selectedIncident.id, nu.id)}
                          disabled={dispatching || selectedIncident.status === 'UNIT_ASSIGNED'}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                        >
                          Dispatch
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GIS Map */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">GIS Telematics Map</h4>
                <GisMap
                  center={[selectedIncident.latitude, selectedIncident.longitude]}
                  zoom={14}
                  height="260px"
                  markers={[
                    { latitude: selectedIncident.latitude, longitude: selectedIncident.longitude, title: selectedIncident.incident_code, priority: 'P1_CRITICAL' }
                  ]}
                />
              </div>

              {/* Close Scene Action */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <span className="text-xs text-slate-500">Scene Resolution Status</span>
                <button
                  onClick={() => handleCloseIncident(selectedIncident.id)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700"
                >
                  Clear Incident & Release Units (10-98)
                </button>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500">
              Select an active emergency from the CAD queue to view telematics and dispatch response units.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
