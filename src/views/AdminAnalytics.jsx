import React, { useState, useEffect } from 'react';
import { 
  BarChart3, ShieldCheck, Activity, Users, Database, 
  RotateCcw, Flame, CheckCircle2, AlertTriangle, Building2, 
  RefreshCw, FileText, Lock 
} from 'lucide-react';
import GisMap from '../components/GisMap.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminAnalytics({ onNotify }) {
  const { currentUser, authFetch } = useAuth();

  const [metrics, setMetrics] = useState(null);
  const [deptStats, setDeptStats] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [resetting, setResetting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'audit'

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const mRes = await authFetch('/api/v1/analytics/overview');
      const dRes = await authFetch('/api/v1/analytics/departments');
      const hRes = await authFetch('/api/v1/analytics/heatmaps');
      const aRes = await authFetch('/api/v1/admin/audit-logs');
      const uRes = await authFetch('/api/v1/admin/users');
      if (mRes.ok) setMetrics(await mRes.json());
      if (dRes.ok) setDeptStats(await dRes.json());
      if (hRes.ok) setHeatmapPoints(await hRes.json());
      if (aRes.ok) setAuditLogs(await aRes.json());
      if (uRes.ok) setUsersList(await uRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleResetSeed = async () => {
    if (!confirm('Re-seed the entire database to clean baseline demo state?')) return;
    setResetting(true);
    try {
      const res = await authFetch('/api/v1/admin/seed-reset', { method: 'POST' });
      if (res.ok) {
        onNotify('Database successfully reset and re-seeded to baseline!', 'success');
        fetchAdminData();
      } else {
        onNotify('Reset failed', 'error');
      }
    } catch {
      onNotify('Reset request failed', 'error');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Admin Executive Header */}
      <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-600/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-white">Citywide Administration & Analytics</h1>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700 font-semibold">
                EXECUTIVE BI
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Chief Executive: <strong className="text-slate-200">{currentUser?.full_name || 'Municipal Chief Executive'}</strong> • SLA Governance & Audit Ledger
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchAdminData}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleResetSeed}
            disabled={resetting}
            className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-50"
            title="Reset database to demo baseline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{resetting ? 'Resetting...' : 'Reset Demo Baseline'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-semibold space-x-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-3 border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-sky-500 text-sky-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Executive KPIs & Heatmap
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-3 border-b-2 transition-all ${
            activeTab === 'users'
              ? 'border-sky-500 text-sky-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          System Staff Directory ({usersList.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-3 border-b-2 transition-all ${
            activeTab === 'audit'
              ? 'border-sky-500 text-sky-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Immutable Governance Audit Ledger ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: EXECUTIVE KPIS & HEATMAP */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          {metrics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Grievances</span>
                <div className="text-2xl font-extrabold text-white mt-1">{metrics.total_complaints}</div>
                <p className="text-[11px] text-slate-500 mt-1">{metrics.pending_complaints} pending resolution</p>
              </div>
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">SLA Compliance Rate</span>
                <div className="text-2xl font-extrabold text-emerald-400 mt-1">{metrics.sla_compliance_rate}%</div>
                <p className="text-[11px] text-slate-500 mt-1">Target turnaround &lt; 24h</p>
              </div>
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Citizen CSAT Rating</span>
                <div className="text-2xl font-extrabold text-amber-400 mt-1">{metrics.average_citizen_satisfaction} / 5.0</div>
                <p className="text-[11px] text-slate-500 mt-1">Based on verified post-repair ratings</p>
              </div>
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active CAD Emergencies</span>
                <div className="text-2xl font-extrabold text-red-400 mt-1">{metrics.active_emergencies}</div>
                <p className="text-[11px] text-slate-500 mt-1">{metrics.available_units} fleet units available</p>
              </div>
            </div>
          )}

          {/* Department Performance Leaderboard */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Department SLA Compliance Leaderboard
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Total Received</th>
                    <th className="py-3 px-4">Resolved</th>
                    <th className="py-3 px-4">SLA Breaches</th>
                    <th className="py-3 px-4">Compliance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {deptStats.map((d) => (
                    <tr key={d.department_id} className="hover:bg-slate-800/40 transition-all">
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-400">{d.code}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{d.department_name}</td>
                      <td className="py-3.5 px-4 font-mono">{d.total_tickets}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400">{d.resolved_tickets}</td>
                      <td className="py-3.5 px-4 font-mono text-amber-400">{d.sla_breaches}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${Math.min(d.compliance_percent, 100)}%` }}
                            ></div>
                          </div>
                          <span className="font-mono font-bold text-white text-[11px]">{d.compliance_percent}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* GIS Density Heatmap */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Geographic Defect Density & Hotspots</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Visual clustering of citizen complaints across municipal jurisdictions.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">{heatmapPoints.length} Points Mapped</span>
            </div>
            <GisMap
              center={[19.0760, 72.8777]}
              zoom={12}
              height="360px"
              markers={heatmapPoints.map((p, idx) => ({
                latitude: p.latitude,
                longitude: p.longitude,
                title: `${p.category} (${p.priority})`,
                priority: p.priority
              }))}
            />
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              System Accounts & Role Allocations
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Provisioned user profiles across the municipal platform.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Email / Phone</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Assigned Department</th>
                  <th className="py-3 px-4">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="py-3.5 px-4 font-mono text-slate-400">{u.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-white">{u.full_name}</td>
                    <td className="py-3.5 px-4">
                      <div>{u.email}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{u.phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold bg-slate-800 text-sky-400 border border-slate-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{u.department_name || 'Central Administration'}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: IMMUTABLE GOVERNANCE AUDIT LEDGER */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm space-y-4">
          <div className="p-5 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Lock className="w-4 h-4 text-sky-400" />
              <span>Immutable Governance Audit Ledger</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tamper-evident record of all privileged administrative actions, unit dispatches, and role transitions.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Details / Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-all font-mono text-[11px]">
                    <td className="py-3 px-4 text-slate-500">#{log.id}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 text-white font-sans font-semibold">{log.user_name || 'System Dispatch'}</td>
                    <td className="py-3 px-4 text-slate-400">{log.ip_address}</td>
                    <td className="py-3 px-4 text-sky-400 font-bold">{log.action}</td>
                    <td className="py-3 px-4 text-slate-400 uppercase">{log.entity_type}</td>
                    <td className="py-3 px-4 text-slate-300 font-sans max-w-xs truncate">{log.diff_payload}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
