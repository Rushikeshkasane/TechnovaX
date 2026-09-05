import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, AlertTriangle, Phone, Radio, Building2, 
  Droplets, Trash2, Zap, Clock, CheckCircle2, ArrowRight 
} from 'lucide-react';

export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="space-y-3">
        <span className="text-xs font-mono text-sky-400 font-bold uppercase">About The Platform</span>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Enterprise Civic Service Desk & CAD Platform</h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          The Enterprise AI Service Desk and Emergency Computer-Aided Dispatch (CAD) platform is a unified municipal governance system designed to eliminate civic complaint backlogs, enforce transparent SLA compliance, and provide sub-second emergency response coordination.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="text-base font-bold text-white">Public Grievance Redressal</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Provides citizens with real-time multi-channel grievance filing, AI triage classification, and GPS geotagging. Ensures that every pothole, sewer breach, and streetlight fault is directly assigned to the right municipal ward supervisor with strict SLA deadlines.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="text-base font-bold text-white">High-Velocity Emergency CAD</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Integrates emergency SOS panic telemetry with real-time fleet telematics. Automatically sorts nearest available ambulances, fire engines, and police patrol vehicles using spatial Haversine distance and computes driving ETAs for instant dispatch orders.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white">Guiding Principles</h3>
        <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
          <li><strong>Zero-Loss Intake:</strong> Every civic issue is captured with immutable ticket reference and SLA timers.</li>
          <li><strong>Deterministic AI Governance:</strong> AI models provide recommendations; operational decisions follow strict municipal bylaws and verified staff workflows.</li>
          <li><strong>Transparent Proof-of-Work:</strong> Officers cannot close complaints without on-site GPS verification and photographic proof.</li>
          <li><strong>Public Accountability:</strong> Citizens retain full authority to rate service quality and file official supervisor appeals.</li>
        </ul>
      </div>
    </div>
  );
}

export function ServicesPage() {
  const depts = [
    {
      title: 'Roads & Bridges Department',
      code: 'RND',
      head: 'Roads & Infrastructure Directorate',
      services: ['Pothole Repair & Cold-Mix Patching', 'Asphalt Resurfacing & Road Widening', 'Sidewalk & Pedestrian Walkway Upkeep', 'Flyover & Bridge Expansion Joints'],
      sla: '24 to 48 Hours'
    },
    {
      title: 'Water Supply & Sewerage Board',
      code: 'WTR',
      head: 'Municipal Water Works Directorate',
      services: ['Main Pipeline Burst & Water Leakage', 'Contaminated Potable Water Supply', 'Underground Sewer Blockage & Overflow', 'Stormwater Drain Desilting'],
      sla: '12 to 36 Hours'
    },
    {
      title: 'Solid Waste Management & Sanitation',
      code: 'SAN',
      head: 'Public Health & Sanitation Division',
      services: ['Community Garbage Bin Overflow', 'Dead Animal Carcass Removal', 'Public Street Sweeping & Debris Disposal', 'Mosquito Fumigation & Pest Control'],
      sla: '12 to 24 Hours'
    },
    {
      title: 'Power & Streetlight Utility',
      code: 'PWR',
      head: 'Municipal Electrical Department',
      services: ['Dark Highway & Streetlight Outages', 'Hazardous Leaning Electric Poles', 'Exposed High-Voltage Cable Insulation', 'Traffic Signal Power Failures'],
      sla: '6 to 18 Hours'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
      <div className="space-y-2">
        <span className="text-xs font-mono text-sky-400 font-bold uppercase">Service Directory</span>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Municipal Civic Services & SLAs</h1>
        <p className="text-sm text-slate-400">
          Standard operational charters and committed service-level turnaround times across municipal departments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {depts.map((d) => (
          <div key={d.code} className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-sky-950 text-sky-300 border border-sky-800">
                {d.code}
              </span>
              <span className="text-xs text-slate-400 font-mono">Standard SLA: {d.sla}</span>
            </div>
            <h3 className="text-base font-bold text-white">{d.title}</h3>
            <p className="text-xs text-slate-400">{d.head}</p>

            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Services Covered</span>
              <ul className="text-xs text-slate-300 space-y-1">
                {d.services.map((s, idx) => (
                  <li key={idx} className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="space-y-2">
        <span className="text-xs font-mono text-sky-400 font-bold uppercase">Citizen Guide</span>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">How the Platform Works</h1>
        <p className="text-sm text-slate-400">
          A step-by-step walkthrough of grievance intake, automated triage, field verification, and emergency dispatch.
        </p>
      </div>

      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center">1</span>
            <h3 className="text-base font-bold text-white">Create an Account & File a Grievance</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed pl-8">
            Register with your name, mobile, and address. When submitting an issue, drop a pin on the interactive Leaflet map or enable device GPS. Upload photographic evidence of the civic problem.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center">2</span>
            <h3 className="text-base font-bold text-white">AI NLP Triage & Department Routing</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed pl-8">
            The multi-subengine AI model analyzes your description, checks for duplicate reports within an 80m spatial radius, determines urgency ($P1$–$P4$), sets a binding SLA countdown, and routes the grievance directly to the appropriate department supervisor.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center">3</span>
            <h3 className="text-base font-bold text-white">Officer Assignment & Proof-of-Work</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed pl-8">
            The department administrator dispatches a qualified field officer. The officer transitions the ticket to IN_PROGRESS. Upon completing the fix, the officer must capture a proof-of-work photo on-site. The platform validates GPS proximity before permitting the status to change to RESOLVED.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center">4</span>
            <h3 className="text-base font-bold text-white">Citizen Review & Satisfaction Rating</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed pl-8">
            You receive an update with the officer’s proof photo. You can submit a 1 to 5 star rating. If you are dissatisfied with the quality of repair, you can file an official Appeal, which automatically reopens the grievance for senior supervisor inspection.
          </p>
        </div>
      </div>
    </div>
  );
}

export function EmergencyHelpPage({ onTriggerSos }) {
  const hotlines = [
    { name: 'National Emergency Support (Police, Fire, Ambulance)', number: '112', type: 'Primary National CAD' },
    { name: 'Municipal Citizen Service & Grievance Helpline', number: '1916', type: 'Toll-Free Civic Desk' },
    { name: 'Disaster Management Control Room', number: '1077', type: 'Flood & Severe Weather' },
    { name: 'Ambulance & Cardiac Care Services', number: '108', type: 'Emergency Medical' },
    { name: 'Fire & Rescue Services', number: '101', type: 'Fire Response' },
    { name: 'Women & Child Safety Helpline', number: '1091', type: 'Police Support' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="space-y-2">
        <span className="text-xs font-mono text-red-400 font-bold uppercase">Emergency Directory</span>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Emergency Assistance & CAD Dispatch</h1>
        <p className="text-sm text-slate-300">
          Immediate hotlines and emergency panic dispatch for life-threatening civic and medical incidents.
        </p>
      </div>

      {/* SOS Alert Banner */}
      <div className="p-6 rounded-2xl bg-red-950/40 border border-red-500/40 space-y-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-bold text-red-200">Life Safety / Urgent Emergency</h3>
            <p className="text-xs text-slate-300 mt-1">
              If you are in immediate physical danger, experiencing a medical crisis, or witnessing a severe hazard (structural collapse, gas explosion, live fallen wires), trigger the 1-Click SOS beacon below to alert the nearest response units.
            </p>
          </div>
        </div>
        <button
          onClick={onTriggerSos}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg flex items-center justify-center space-x-2"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Trigger Live GPS SOS Signal</span>
        </button>
      </div>

      {/* Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">Emergency Hotline Directory</h3>
        </div>
        <div className="divide-y divide-slate-800">
          {hotlines.map((h, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-all">
              <div>
                <div className="text-xs font-semibold text-white">{h.name}</div>
                <div className="text-[11px] text-slate-400">{h.type}</div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-base font-extrabold text-sky-400 px-3 py-1 bg-slate-800 rounded-lg border border-slate-700">
                  {h.number}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
