import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, AlertTriangle, Search, FileText, CheckCircle2, 
  Clock, ArrowRight, Building2, Droplets, Trash2, Zap, Radio, 
  HelpCircle, PhoneCall, ChevronRight, UserPlus, LogIn, ExternalLink
} from 'lucide-react';

export default function PublicHome({ onTriggerSos }) {
  const [ticketSearch, setTicketSearch] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    if (!ticketSearch.trim()) return;
    setTrackingLoading(true);
    setTrackingError('');
    setTrackingResult(null);

    try {
      const res = await fetch(`/api/v1/complaints/public/track/${encodeURIComponent(ticketSearch.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setTrackingResult(data);
      } else {
        const err = await res.json();
        setTrackingError(err.detail || 'Grievance ticket not found. Please verify the ticket reference.');
      }
    } catch {
      setTrackingError('Unable to connect to municipal grievance tracker.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const services = [
    {
      title: 'Roads & Infrastructure',
      code: 'RND',
      desc: 'Pothole repairs, asphalt resurfacing, arterial bridges, flyovers, and sidewalk maintenance.',
      icon: Building2,
      deptId: 'dept-roads'
    },
    {
      title: 'Water Supply & Sewage',
      code: 'WTR',
      desc: 'Pipe leakages, contaminated drinking water, sewer blockages, and pumping station alerts.',
      icon: Droplets,
      deptId: 'dept-water'
    },
    {
      title: 'Solid Waste & Sanitation',
      code: 'SAN',
      desc: 'Garbage accumulation, community bin clearance, fumigation, and open dump sanitation.',
      icon: Trash2,
      deptId: 'dept-waste'
    },
    {
      title: 'Power & Public Lighting',
      code: 'PWR',
      desc: 'Dark streetlights, hazardous electric poles, sparking transformers, and civic junction power.',
      icon: Zap,
      deptId: 'dept-power'
    }
  ];

  return (
    <div className="space-y-12 pb-16">
      {/* Official Government Notice Bar */}
      <div className="bg-slate-900 border-b border-slate-800 py-2.5 px-4 text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-semibold text-white">Central Citizen Services & Emergency Response Portal</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 hidden sm:inline">24x7 Municipal Redressal & Computer-Aided Dispatch (CAD)</span>
          </div>
          <div className="flex items-center space-x-4 font-mono text-[11px]">
            <span className="text-slate-400">Emergency: <strong className="text-red-400 font-bold">112</strong></span>
            <span className="text-slate-400">Civic Helpline: <strong className="text-sky-400 font-bold">1916</strong></span>
          </div>
        </div>
      </div>

      {/* Main Hero Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-xl space-y-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-950/70 border border-sky-500/30 text-sky-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Unified Public Administration System</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Enterprise Civic Service Desk, Public Grievance & Emergency CAD Platform
            </h1>
            <p className="text-base text-slate-300 leading-relaxed">
              An intelligent, transparent civic platform connecting citizens, municipal departments, field inspection officers, emergency dispatchers, and central administration for rapid redressal and accountable governance.
            </p>
          </div>

          {/* Core Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Citizen Action */}
            <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-sky-500/50 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                  1
                </div>
                <h3 className="text-base font-bold text-white">Citizen Grievance Filing</h3>
                <p className="text-xs text-slate-400">
                  Submit grievances with geo-location tagging, photos, and automated AI triage for department routing.
                </p>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Link
                  to="/citizen/dashboard"
                  className="flex-1 py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold text-center transition-all flex items-center justify-center space-x-1"
                >
                  <span>File a Grievance</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/register"
                  className="py-2 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-all"
                >
                  Register
                </Link>
              </div>
            </div>

            {/* Emergency SOS */}
            <div className="p-5 rounded-xl bg-red-950/20 border border-red-500/30 hover:border-red-500/50 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">1-Click Emergency SOS</h3>
                <p className="text-xs text-slate-300">
                  Instant P1 emergency broadcast with live GPS coordinates sent straight to the Computer-Aided Dispatch board.
                </p>
              </div>
              <button
                onClick={onTriggerSos}
                className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold text-center transition-all shadow-md flex items-center justify-center space-x-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Trigger Emergency SOS (112)</span>
              </button>
            </div>

            {/* Staff & Officer Portal */}
            <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Department & Field Staff</h3>
                <p className="text-xs text-slate-400">
                  Dedicated workspaces for Field Officers, Department Supervisors, CAD Dispatchers, and Municipal Executives.
                </p>
              </div>
              <Link
                to="/login"
                className="w-full py-2 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold text-center transition-all flex items-center justify-center space-x-1"
              >
                <span>Staff & Official Sign In</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Public Grievance Status Tracker */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Search className="w-5 h-5 text-sky-400" />
              <span>Public Grievance Status Lookup</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Check the live progress, department assignment, and SLA turnaround of any grievance using its official reference number.
            </p>
          </div>

          <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl">
            <div className="relative flex-1">
              <input
                type="text"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="Enter Ticket ID (e.g. GRV-2026-0001)"
                className="w-full pl-4 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono uppercase focus:outline-none focus:border-sky-500"
              />
            </div>
            <button
              type="submit"
              disabled={trackingLoading}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-2 whitespace-nowrap"
            >
              {trackingLoading ? <span>Searching...</span> : <span>Track Progress</span>}
            </button>
          </form>

          {/* Tracking Error */}
          {trackingError && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
              {trackingError}
            </div>
          )}

          {/* Tracking Result Display */}
          {trackingResult && (
            <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 space-y-6 animate-fadeIn">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-sky-400 font-bold">{trackingResult.ticket_number}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                      trackingResult.status === 'RESOLVED' || trackingResult.status === 'CLOSED'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : trackingResult.status === 'IN_PROGRESS'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                    }`}>
                      {trackingResult.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{trackingResult.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Category: <span className="text-slate-200 capitalize">{trackingResult.category}</span> • Department: <span className="text-slate-200">{trackingResult.department_name}</span>
                  </p>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-500">Target SLA Deadline</span>
                  <div className="font-mono text-slate-300 font-semibold mt-0.5">
                    {trackingResult.sla_deadline ? new Date(trackingResult.sla_deadline).toLocaleString() : 'Within 48h'}
                  </div>
                </div>
              </div>

              {/* Progress Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Resolution Progress Timeline</h4>
                <div className="space-y-3 pl-2 border-l-2 border-slate-800">
                  {trackingResult.timeline.map((item, idx) => (
                    <div key={idx} className="relative pl-4">
                      <div className="absolute -left-[9px] top-1.5 w-2 h-2 rounded-full bg-sky-400 ring-4 ring-slate-900"></div>
                      <div className="text-xs font-semibold text-slate-200">{item.action.replace(/_/g, ' ')}</div>
                      <p className="text-xs text-slate-400 mt-0.5">{item.comment}</p>
                      <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Municipal Departments Catalog */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 mb-6">
          <h2 className="text-xl font-bold text-white">Municipal Service Directories</h2>
          <p className="text-xs text-slate-400">
            Departments integrated under the unified digital service desk and automated triage system.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {services.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.code} className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-sky-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {s.code}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workflow Transparency Guide */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">How Grievance Redressal Works</h2>
            <p className="text-xs text-slate-400 mt-1">
              End-to-end transparency from initial submission to proof-of-work inspection and citizen rating.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="text-xs font-mono font-bold text-sky-400">STEP 1</span>
              <h4 className="text-sm font-bold text-white">Intake & AI Triage</h4>
              <p className="text-xs text-slate-400">
                Citizen submits issue with GPS location and photo. Natural language models classify category, urgency, and SLA target.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="text-xs font-mono font-bold text-sky-400">STEP 2</span>
              <h4 className="text-sm font-bold text-white">Department Routing</h4>
              <p className="text-xs text-slate-400">
                Grievance is routed to the responsible municipal department supervisor, who reviews workload and assigns a field officer.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="text-xs font-mono font-bold text-sky-400">STEP 3</span>
              <h4 className="text-sm font-bold text-white">Field Work & Proof</h4>
              <p className="text-xs text-slate-400">
                Assigned officer arrives on scene. Mandatory proof-of-resolution photo with GPS geotag tolerance is uploaded.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="text-xs font-mono font-bold text-sky-400">STEP 4</span>
              <h4 className="text-sm font-bold text-white">Citizen Review</h4>
              <p className="text-xs text-slate-400">
                Citizen receives notification, reviews proof of work, rates service delivery (1–5 stars), or files an official appeal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
