import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Clock, CheckCircle2, AlertTriangle, Camera, 
  MapPin, ChevronRight, FileCheck, ArrowUpRight, ShieldCheck, 
  RefreshCw, Upload, Image 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function OfficerWorkspace({ onNotify }) {
  const { currentUser, authFetch } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [proofUrl, setProofUrl] = useState('/uploads/proof_sample.jpg');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [officerLat, setOfficerLat] = useState(19.0620);
  const [officerLon, setOfficerLon] = useState(72.8350);
  const [resolving, setResolving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/v1/complaints?status=ASSIGNED');
      const inProgRes = await authFetch('/api/v1/complaints?status=IN_PROGRESS');
      if (res.ok && inProgRes.ok) {
        const assigned = await res.json();
        const inProg = await inProgRes.json();
        const combined = [...inProg, ...assigned];
        setTasks(combined);
        if (combined.length > 0 && !selectedTask) {
          setSelectedTask(combined[0]);
        } else if (selectedTask) {
          const updated = combined.find(t => t.id === selectedTask.id);
          if (updated) setSelectedTask(updated);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleSetInProgress = async (taskId) => {
    try {
      const officerName = currentUser?.full_name || 'Field Officer';
      const res = await authFetch(`/api/v1/complaints/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          comment: `Field Officer ${officerName} arrived on scene and initiated repair work.`
        })
      });
      if (res.ok) {
        onNotify('Task transitioned to IN_PROGRESS. SLA timer active.', 'success');
        fetchTasks();
      } else {
        const err = await res.json();
        onNotify(err.detail || 'Failed to update status', 'error');
      }
    } catch {
      onNotify('Network error updating status', 'error');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await authFetch('/api/v1/complaints/upload-media', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setProofUrl(data.file_url);
        onNotify('Proof photo uploaded successfully.', 'info');
      }
    } catch {
      onNotify('Photo upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    setResolving(true);
    try {
      const res = await authFetch(`/api/v1/complaints/${selectedTask.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          proof_photo_url: proofUrl,
          resolution_notes: resolutionNotes,
          officer_latitude: officerLat,
          officer_longitude: officerLon
        })
      });
      if (res.ok) {
        const data = await res.json();
        onNotify(`Resolution Verified! ${data.geo_validation?.reason || 'Proof confirmed.'}`, 'success');
        setShowResolveModal(false);
        setResolutionNotes('');
        setSelectedTask(null);
        fetchTasks();
      } else {
        const err = await res.json();
        onNotify(err.detail || 'Resolution submission rejected', 'error');
      }
    } catch {
      onNotify('Error submitting resolution', 'error');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Officer Header */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-white">
                {currentUser?.full_name || 'Field Officer Inspector'}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] border border-emerald-500/30 font-semibold">
                ON ACTIVE DUTY
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {currentUser?.department_name || 'Department of Roads & Infrastructure'} • Staff ID: <span className="font-mono text-slate-300">{currentUser?.id || 'officer-01'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono">
            Queue: <strong className="text-amber-400">{tasks.length}</strong> Assigned Tasks
          </div>
          <button
            onClick={fetchTasks}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            title="Refresh assigned tasks"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task Queue and Work Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Task List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Work Queue</h3>
            <span className="text-[11px] font-mono text-slate-500">Sorted by SLA Urgency</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading assigned tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">Queue Clear</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No active or pending grievances assigned to your beat at this moment.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1 scrollbar-thin">
              {tasks.map((task) => {
                const isSelected = selectedTask?.id === task.id;
                const isInProgress = task.status === 'IN_PROGRESS';
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-sky-500 shadow-md'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-sky-400">{task.ticket_number}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        isInProgress
                          ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                          : 'bg-blue-950/60 text-blue-300 border-blue-800'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-white line-clamp-1">{task.title}</div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{task.description}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-slate-800">
                      <span>{task.category}</span>
                      <span className="font-mono text-amber-400 font-bold">{task.priority}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Task Details */}
        <div className="lg:col-span-7 bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
          {selectedTask ? (
            <>
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-sky-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-700">
                      {selectedTask.ticket_number}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Filing Date: {new Date(selectedTask.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1.5">{selectedTask.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedTask.address_text}</p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    selectedTask.status === 'IN_PROGRESS'
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-blue-950 text-blue-300 border-blue-800'
                  }`}>
                    {selectedTask.status}
                  </span>
                  <div className="text-[11px] font-mono text-slate-500 mt-1.5">
                    Target SLA: {selectedTask.sla_deadline ? new Date(selectedTask.sla_deadline).toLocaleString() : '24 Hours'}
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                {selectedTask.status === 'ASSIGNED' ? (
                  <button
                    onClick={() => handleSetInProgress(selectedTask.id)}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all flex items-center space-x-2 shadow-sm"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Acknowledge & Mark IN_PROGRESS</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setOfficerLat(selectedTask.latitude);
                      setOfficerLon(selectedTask.longitude);
                      setShowResolveModal(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center space-x-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Upload Proof & Complete Resolution</span>
                  </button>
                )}
              </div>

              {/* Details & Citizen Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Citizen Report Narrative</h4>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  {selectedTask.description}
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Action History</h4>
                <div className="space-y-3 pl-2 border-l-2 border-slate-800">
                  {selectedTask.timeline?.map((item, idx) => (
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
            </>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500">
              Select a task from the work queue to review details and submit resolution evidence.
            </div>
          )}
        </div>
      </div>

      {/* Resolution Proof-of-Work Modal */}
      {showResolveModal && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-700 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Mandatory Proof-of-Work Verification</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Resolution requires on-site photographic evidence and GPS proximity match ({selectedTask.ticket_number}).
              </p>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Proof-of-Work Photo</label>
                <div className="flex items-center space-x-3">
                  <label className="flex-1 cursor-pointer flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-sky-500 text-slate-300 text-xs transition-all">
                    <Camera className="w-4 h-4 text-sky-400" />
                    <span>{uploading ? 'Uploading image...' : 'Capture / Upload Photo'}</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>
                {proofUrl && (
                  <div className="mt-2 relative rounded-lg overflow-hidden border border-slate-700 max-h-40">
                    <img src={proofUrl} alt="Preview" className="w-full h-36 object-cover" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Officer On-Site Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={officerLat}
                    onChange={(e) => setOfficerLat(parseFloat(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Officer On-Site Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={officerLon}
                    onChange={(e) => setOfficerLon(parseFloat(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Field Technical Resolution Notes *</label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Surface cleaned, aggregate base laid, asphalt cold-mix compacted and sealed."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white resize-none focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving || uploading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {resolving ? 'Verifying Proof...' : 'Validate & Resolve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
