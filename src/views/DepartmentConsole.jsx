import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, AlertOctagon, CheckCircle2, Clock, 
  ArrowRight, ShieldAlert, Filter, UserCheck, RefreshCw 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function DepartmentConsole({ onNotify }) {
  const { currentUser, authFetch } = useAuth();

  const [complaints, setComplaints] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [assigningTicketId, setAssigningTicketId] = useState(null);
  const [loading, setLoading] = useState(true);

  const deptId = currentUser?.department_id || 'dept-roads';
  const deptName = currentUser?.department_name || 'Department Management Console';

  const fetchDepartmentData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/v1/complaints?department_id=${deptId}`);
      const usersRes = await authFetch(`/api/v1/admin/users?department_id=${deptId}`);
      if (res.ok && usersRes.ok) {
        const cData = await res.json();
        const uData = await usersRes.json();
        setComplaints(cData);
        setOfficers(uData.filter(u => u.role === 'officer'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentData();
  }, [deptId]);

  const handleAssign = async (ticketId, officerId) => {
    if (!officerId) return;
    try {
      const supervisorName = currentUser?.full_name || 'Department Supervisor';
      const res = await authFetch(`/api/v1/complaints/${ticketId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({
          assigned_officer_id: officerId,
          comment: `Dispatched by Department Supervisor ${supervisorName}`
        })
      });
      if (res.ok) {
        onNotify('Grievance successfully assigned to field officer!', 'success');
        setAssigningTicketId(null);
        fetchDepartmentData();
      } else {
        const err = await res.json();
        onNotify(err.detail || 'Failed to assign task', 'error');
      }
    } catch {
      onNotify('Network error assigning task', 'error');
    }
  };

  // Metrics
  const total = complaints.length;
  const inProgress = complaints.filter(c => c.status === 'IN_PROGRESS').length;
  const resolved = complaints.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
  const unassigned = complaints.filter(c => !c.assigned_officer_id && c.status === 'SUBMITTED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Department Banner */}
      <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-white">{deptName}</h1>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                ACTIVE QUEUE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Supervisor Console • <strong className="text-slate-200">{currentUser?.full_name || 'Department Administrator'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDepartmentData}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Queue</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Department Workload</span>
          <div className="text-2xl font-extrabold text-white mt-1">{total} Grievances</div>
          <p className="text-[11px] text-slate-500 mt-1">Across municipal jurisdiction</p>
        </div>
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pending Officer Assignment</span>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">{unassigned}</div>
          <p className="text-[11px] text-amber-500/80 mt-1">Requires immediate dispatch</p>
        </div>
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Work In Progress</span>
          <div className="text-2xl font-extrabold text-sky-400 mt-1">{inProgress}</div>
          <p className="text-[11px] text-slate-500 mt-1">Field teams active on scene</p>
        </div>
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Resolved & Closed</span>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">{resolved}</div>
          <p className="text-[11px] text-emerald-500/80 mt-1">Verified with proof of work</p>
        </div>
      </div>

      {/* Main Workload & Assignment Queue */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">Department Grievances & Officer Dispatch</h2>
            <p className="text-xs text-slate-400">Review unassigned tickets and dispatch qualified field officers.</p>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Available Officers in Department: <strong className="text-sky-400">{officers.length}</strong>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading department data...</div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">No Complaints in Department Queue</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              All grievances for {deptName} have been resolved or routed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Ticket</th>
                  <th className="py-3.5 px-4">Subject & Location</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Assigned Officer</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {complaints.map((c) => {
                  const needsAssignment = !c.assigned_officer_id || c.status === 'SUBMITTED';
                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-all">
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-400">
                        {c.ticket_number}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-white truncate">{c.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">{c.address_text}</div>
                      </td>
                      <td className="py-3.5 px-4 capitalize">{c.category}</td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className={`font-bold ${
                          c.priority === 'P1_CRITICAL' ? 'text-red-400' : 'text-amber-400'
                        }`}>
                          {c.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          c.status === 'RESOLVED' || c.status === 'CLOSED'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                            : c.status === 'IN_PROGRESS'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                            : 'bg-blue-950/60 text-blue-300 border-blue-800'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {c.assigned_officer_name ? (
                          <span className="text-white font-medium">{c.assigned_officer_name}</span>
                        ) : (
                          <span className="text-amber-400/90 font-mono text-[11px]">Pending Assignment</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {assigningTicketId === c.id ? (
                          <div className="flex items-center justify-end space-x-2">
                            <select
                              value={selectedOfficer}
                              onChange={(e) => setSelectedOfficer(e.target.value)}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
                            >
                              <option value="">Select Officer...</option>
                              {officers.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.full_name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAssign(c.id, selectedOfficer)}
                              disabled={!selectedOfficer}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setAssigningTicketId(null)}
                              className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAssigningTicketId(c.id);
                              setSelectedOfficer(c.assigned_officer_id || '');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 text-xs font-semibold transition-all"
                          >
                            {c.assigned_officer_id ? 'Reassign' : 'Assign Officer'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
