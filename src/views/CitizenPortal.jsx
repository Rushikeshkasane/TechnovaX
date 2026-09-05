import React, { useState, useEffect } from 'react';
import { 
  FileText, Send, MapPin, Camera, Bot, Star, ShieldCheck, 
  Clock, AlertCircle, Sparkles, MessageSquare, ChevronRight, CheckCircle2,
  User, RefreshCw, AlertTriangle
} from 'lucide-react';
import GisMap from '../components/GisMap.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function CitizenPortal({ onTriggerSos, onNotify }) {
  const { currentUser, authFetch } = useAuth();

  const [activeTab, setActiveTab] = useState('file'); // 'file', 'track', 'chat'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [lat, setLat] = useState(19.0760);
  const [lon, setLon] = useState(72.8777);
  const [address, setAddress] = useState(currentUser?.address || 'Linking Road, Bandra West, Mumbai');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);

  // Tracking tab state
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [showAppealModal, setShowAppealModal] = useState(false);

  // Chat tab state
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: `Namaste ${currentUser?.full_name || 'Citizen'}! I am your AI Civic Assistant. How can I assist you with municipal services, bylaws, or your active grievance status today?` }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Fetch citizen's complaints with authenticated token
  const fetchComplaints = async () => {
    setLoadingComplaints(true);
    try {
      const res = await authFetch('/api/v1/complaints');
      if (res.ok) {
        const data = await res.json();
        setComplaints(data);
        if (data.length > 0 && !selectedComplaint) {
          setSelectedComplaint(data[0]);
        } else if (selectedComplaint) {
          const updated = data.find(c => c.id === selectedComplaint.id);
          if (updated) setSelectedComplaint(updated);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComplaints(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // Debounced AI triage preview
  useEffect(() => {
    if (description.length > 15) {
      const timer = setTimeout(async () => {
        try {
          const res = await authFetch('/api/v1/ai/triage', {
            method: 'POST',
            body: JSON.stringify({ text: `${title} ${description}`, latitude: lat, longitude: lon })
          });
          if (res.ok) {
            const data = await res.json();
            setAiPreview(data);
          }
        } catch {}
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setAiPreview(null);
    }
  }, [title, description, lat, lon]);

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!title || !description) return;
    setSubmitting(true);
    try {
      const res = await authFetch('/api/v1/complaints', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          category: category || undefined,
          latitude: lat,
          longitude: lon,
          address_text: address,
          is_anonymous: isAnonymous
        })
      });
      if (res.ok) {
        const created = await res.json();
        onNotify(`Grievance filed successfully! Ticket ID: ${created.ticket_number}`, 'success');
        setTitle('');
        setDescription('');
        setAiPreview(null);
        await fetchComplaints();
        setSelectedComplaint(created);
        setActiveTab('track');
      } else {
        onNotify('Failed to file grievance. Please try again.', 'error');
      }
    } catch {
      onNotify('Network error filing grievance.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await authFetch('/api/v1/ai/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMsg })
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'I am currently operating in offline mode. For urgent emergencies, please use the red SOS button.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!selectedComplaint) return;
    try {
      const res = await authFetch(`/api/v1/complaints/${selectedComplaint.id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          rating: Number(rating),
          comments: feedbackComment,
          is_appealed: false
        })
      });
      if (res.ok) {
        onNotify('Thank you for rating municipal service delivery!', 'success');
        setFeedbackComment('');
        fetchComplaints();
      }
    } catch {
      onNotify('Failed to submit rating', 'error');
    }
  };

  const handleAppealSubmit = async () => {
    if (!selectedComplaint || !appealReason) return;
    try {
      const res = await authFetch(`/api/v1/complaints/${selectedComplaint.id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          rating: 1,
          comments: 'Citizen rejected resolution and filed an official appeal.',
          is_appealed: true,
          appeal_reason: appealReason
        })
      });
      if (res.ok) {
        onNotify('Appeal registered. Ticket re-opened for supervisor audit.', 'warning');
        setShowAppealModal(false);
        setAppealReason('');
        fetchComplaints();
      }
    } catch {
      onNotify('Appeal submission failed', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Citizen Welcome Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold uppercase text-sky-400">Citizen Workspace</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
              Verified Resident
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            {currentUser?.full_name || 'Aarav Sharma'}
          </h1>
          <p className="text-xs text-slate-400">
            {currentUser?.address ? `${currentUser.address}, ${currentUser.city || 'Mumbai'}` : 'Mumbai Civic Beat'}{' '}
            • Registered: <span className="font-mono text-slate-300">{currentUser?.phone || '+91 98765 43210'}</span>
          </p>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 gap-1">
          <button
            onClick={() => setActiveTab('file')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'file' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            File Grievance
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'track' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            My Grievances ({complaints.length})
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'chat' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Civic AI Assistant
          </button>
        </div>
      </div>

      {/* TAB 1: FILE GRIEVANCE */}
      {activeTab === 'file' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-sky-400" />
                  <span>Submit Public Grievance</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Report civic infrastructure defects directly to the responsible municipal department.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 text-slate-400">Zero-Loss Intake</span>
            </div>

            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Grievance Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Hazardous pothole on main road junction"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe location, severity, nearby landmark, and hazard to vehicles or pedestrians..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              {/* AI Triage Recommendation Panel */}
              {aiPreview && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-400 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Triage Recommendation</span>
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      aiPreview.priority === 'P1_CRITICAL'
                        ? 'bg-red-950 text-red-300 border border-red-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {aiPreview.priority} (Target SLA: {aiPreview.sla_hours}h)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Recommended Department:</span>
                      <strong className="text-white">{aiPreview.suggested_department_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Classified Category:</span>
                      <strong className="text-white capitalize">{aiPreview.category}</strong>
                    </div>
                  </div>
                  {aiPreview.is_duplicate && (
                    <div className="p-2 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[11px]">
                      Notice: Similar grievance reported nearby ({aiPreview.duplicate_of_ticket}). Tickets will be clustered for efficiency.
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Category Override (Optional)
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="">Auto-detected by AI</option>
                    <option value="pothole">Pothole & Road Hazard</option>
                    <option value="drainage">Drainage & Water Leakage</option>
                    <option value="garbage">Garbage & Sanitation</option>
                    <option value="streetlight">Streetlight & Electrical</option>
                    <option value="other">General Municipal Service</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Address / Landmark
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0"
                  />
                  <span>File as anonymous grievance</span>
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md flex items-center space-x-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Filing grievance...' : 'Submit Grievance'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Location Map Picker */}
          <div className="lg:col-span-5 bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>Geographic Location Tagging</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">{lat.toFixed(4)}, {lon.toFixed(4)}</span>
            </div>
            <p className="text-xs text-slate-400">
              Click anywhere on the map to place the defect marker precisely.
            </p>
            <GisMap
              center={[lat, lon]}
              zoom={14}
              height="340px"
              markers={[{ latitude: lat, longitude: lon, title: title || 'Reported Incident', priority: 'P2_HIGH' }]}
              onMapClick={(newLat, newLon) => {
                setLat(newLat);
                setLon(newLon);
                setAddress(`Coordinates: ${newLat.toFixed(4)}, ${newLon.toFixed(4)}`);
              }}
            />
          </div>
        </div>
      )}

      {/* TAB 2: TRACK GRIEVANCES */}
      {activeTab === 'track' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Grievance List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Your Filed Grievances</h3>
              <button
                onClick={fetchComplaints}
                className="text-xs text-sky-400 hover:underline flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {loadingComplaints ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading your grievances...</div>
            ) : complaints.length === 0 ? (
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">No Grievances Found</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  You have not submitted any municipal complaints yet.
                </p>
                <button
                  onClick={() => setActiveTab('file')}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all"
                >
                  File Your First Grievance
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                {complaints.map((c) => {
                  const isSelected = selectedComplaint?.id === c.id;
                  const statusColors = {
                    SUBMITTED: 'bg-slate-800 text-slate-300 border-slate-700',
                    ASSIGNED: 'bg-blue-950/60 text-blue-300 border-blue-800',
                    IN_PROGRESS: 'bg-amber-950/60 text-amber-300 border-amber-800',
                    RESOLVED: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
                    CLOSED: 'bg-slate-800 text-slate-400 border-slate-700',
                    REOPENED: 'bg-rose-950/60 text-rose-300 border-rose-800'
                  };

                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedComplaint(c)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-800 border-sky-500 shadow-md'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono font-bold text-sky-400">{c.ticket_number}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColors[c.status] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                          {c.status}
                        </span>
                      </div>
                      <div className="font-semibold text-xs text-white line-clamp-1">{c.title}</div>
                      <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{c.description}</div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-slate-800">
                        <span>{c.department_name}</span>
                        <span className="font-mono text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Grievance Details View */}
          <div className="lg:col-span-7 bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
            {selectedComplaint ? (
              <>
                <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-sky-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-700">
                        {selectedComplaint.ticket_number}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(selectedComplaint.created_at).toLocaleString()}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white mt-1.5">{selectedComplaint.title}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedComplaint.address_text}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-sky-300 border border-slate-700">
                      {selectedComplaint.status}
                    </span>
                    <div className="text-[11px] font-mono text-slate-500 mt-1.5">
                      SLA: {selectedComplaint.sla_deadline ? new Date(selectedComplaint.sla_deadline).toLocaleString() : 'Within 48h'}
                    </div>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Department</span>
                    <p className="font-semibold text-white mt-0.5">{selectedComplaint.department_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Assigned Officer</span>
                    <p className="font-semibold text-white mt-0.5">{selectedComplaint.assigned_officer_name || 'Pending Assignment'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Priority</span>
                    <p className="font-semibold text-amber-400 font-mono mt-0.5">{selectedComplaint.priority}</p>
                  </div>
                </div>

                {/* Proof of Work Review */}
                {selectedComplaint.attachments?.some(a => a.attachment_type === 'OFFICER_PROOF_OF_WORK') && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verified Officer Proof-of-Work</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <img
                        src={selectedComplaint.attachments.find(a => a.attachment_type === 'OFFICER_PROOF_OF_WORK').file_url}
                        alt="Resolution Proof"
                        className="w-full sm:w-48 h-28 object-cover rounded-lg border border-slate-700"
                      />
                      <div className="text-xs text-slate-300 space-y-1">
                        <p className="font-semibold text-white">Repair Work Confirmed on Site</p>
                        <p className="text-slate-400 text-[11px]">
                          Photographed by {selectedComplaint.assigned_officer_name} within GPS tolerance of reported location.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Citizen Rating / Feedback Section */}
                {selectedComplaint.status === 'RESOLVED' && !selectedComplaint.feedback && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Rate Municipal Resolution</h4>
                    <p className="text-xs text-slate-400">
                      Please rate the quality and timeliness of the repair work.
                    </p>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star className={`w-5 h-5 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-slate-300 ml-2">{rating} of 5 Stars</span>
                    </div>
                    <textarea
                      rows={2}
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Optional feedback comment on the service quality..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white resize-none"
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleFeedbackSubmit}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
                      >
                        Submit 5-Star Review & Close Ticket
                      </button>
                      <button
                        onClick={() => setShowAppealModal(true)}
                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-red-950/60 hover:text-red-300 border border-slate-700 text-slate-400 text-xs font-semibold transition-all"
                      >
                        Reject Fix & Appeal
                      </button>
                    </div>
                  </div>
                )}

                {/* Display existing feedback */}
                {selectedComplaint.feedback && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                    <span className="text-slate-500 text-[11px] block">Your Review</span>
                    <div className="flex items-center space-x-1 text-amber-400">
                      {[...Array(selectedComplaint.feedback.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-slate-300 italic">"{selectedComplaint.feedback.comments || 'Citizen satisfied with service.'}"</p>
                  </div>
                )}

                {/* Timeline */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Official Action Timeline</h4>
                  <div className="space-y-3 pl-2 border-l-2 border-slate-800">
                    {selectedComplaint.timeline?.map((item, idx) => (
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
                Select a grievance from the list to view its complete progress timeline.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CIVIC AI ASSISTANT */}
      {activeTab === 'chat' && (
        <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-800 max-w-3xl mx-auto space-y-4 shadow-sm">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-600/20 text-sky-400 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Conversational Civic RAG Assistant</h3>
                <p className="text-[11px] text-slate-400">Ask bylaws questions, turnaround inquiries, or check ticket status.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 min-h-[300px] max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl text-xs leading-relaxed max-w-[85%] ${
                  msg.sender === 'user'
                    ? 'ml-auto bg-sky-600 text-white rounded-br-none'
                    : 'mr-auto bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {chatLoading && (
              <div className="p-3.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-slate-400 max-w-xs animate-pulse">
                Consulting municipal knowledge base...
              </div>
            )}
          </div>

          <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-slate-800">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask anything (e.g. 'Status of GRV-2026-0001' or 'How long to repair a water pipe?')..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              disabled={chatLoading}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Appeal Modal Dialog */}
      {showAppealModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">File Grievance Appeal</h3>
            <p className="text-xs text-slate-400">
              Your appeal will reopen ticket <strong>{selectedComplaint?.ticket_number}</strong> and mark it for supervisory audit by the department head.
            </p>
            <textarea
              rows={3}
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="State reason for rejecting resolution..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white resize-none focus:outline-none focus:border-red-500"
            />
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAppealModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAppealSubmit}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Confirm Official Appeal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
