import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  User, Briefcase, Building2, Radio, BarChart3, 
  Lock, Mail, Phone, MapPin, CheckCircle2, AlertCircle, 
  ArrowRight, ShieldCheck, Sparkles, KeyRound 
} from 'lucide-react';

export function LoginPage() {
  const { login, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // Determine initial active role tab from URL or query
  const queryParams = new URLSearchParams(location.search);
  const roleFromQuery = queryParams.get('role');
  const roleFromParam = params.role;
  const redirectTarget = queryParams.get('redirect');

  const getInitialRole = () => {
    const r = roleFromParam || roleFromQuery;
    if (r === 'officer') return 'officer';
    if (r === 'department' || r === 'department_admin') return 'department_admin';
    if (r === 'emergency' || r === 'ert_responder') return 'ert_responder';
    if (r === 'admin') return 'admin';
    return 'citizen';
  };

  const [activeRole, setActiveRole] = useState(getInitialRole);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [useOtp, setUseOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sync role if query parameter changes
  useEffect(() => {
    setActiveRole(getInitialRole());
  }, [location.search, params.role]);

  const roleConfigs = {
    citizen: {
      label: 'Citizen Portal',
      icon: User,
      badge: 'Public Service',
      demoEmail: 'citizen@civic.gov',
      demoPassword: 'citizen123',
      defaultRedirect: '/citizen/dashboard',
      description: 'Sign in to file grievances, track status, and rate municipal service delivery.'
    },
    officer: {
      label: 'Field Officer',
      icon: Briefcase,
      badge: 'Field Desk',
      demoEmail: 'officer@civic.gov',
      demoPassword: 'officer123',
      defaultRedirect: '/officer/dashboard',
      description: 'Authorized field inspectors: update work status and upload photo proof-of-work.'
    },
    department_admin: {
      label: 'Department Admin',
      icon: Building2,
      badge: 'Supervisor',
      demoEmail: 'dept_head@civic.gov',
      demoPassword: 'dept123',
      defaultRedirect: '/department/dashboard',
      description: 'Departmental supervisors: assign officers, monitor turnaround, and enforce SLAs.'
    },
    ert_responder: {
      label: 'Emergency CAD',
      icon: Radio,
      badge: 'CAD Dispatch',
      demoEmail: 'cad_dispatcher@civic.gov',
      demoPassword: 'ert123',
      defaultRedirect: '/emergency/dashboard',
      description: 'Emergency CAD Dispatchers: manage active 911 / 112 SOS beacons and order fleet dispatches.'
    },
    admin: {
      label: 'System Admin',
      icon: BarChart3,
      badge: 'Command Center',
      demoEmail: 'admin@civic.gov',
      demoPassword: 'admin123',
      defaultRedirect: '/admin/dashboard',
      description: 'Central executive administration: citywide BI analytics, user provisioning, and audit ledgers.'
    }
  };

  const config = roleConfigs[activeRole] || roleConfigs.citizen;

  // Handle Quick Demo Fill
  const handleQuickFill = () => {
    setIdentifier(config.demoEmail);
    setPassword(config.demoPassword);
    setUseOtp(false);
    setErrorMessage('');
  };

  // Instant 1-Click Authenticated Switch (Evaluator Convenience)
  const handleInstantSwitch = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await switchDemoRole(activeRole);
      navigate(redirectTarget || config.defaultRedirect);
    } catch {
      setErrorMessage('Instant demo switch failed. Please log in manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Please provide an email address or mobile number.');
      return;
    }
    if (!useOtp && !password) {
      setErrorMessage('Please enter your password.');
      return;
    }
    if (useOtp && !otp) {
      setErrorMessage('Please enter the OTP (or demo 123456).');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const user = await login({
        phone_or_email: identifier.trim(),
        password: useOtp ? undefined : password,
        otp: useOtp ? otp.trim() : undefined,
        expected_role: activeRole
      });

      // Redirect user to destination or role's default dashboard
      const target = redirectTarget || roleConfigs[user.role]?.defaultRedirect || '/';
      navigate(target);
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-8 px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Header Title */}
        <div className="p-6 sm:p-8 border-b border-slate-800 space-y-2 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-sky-400 font-mono text-xs uppercase">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Secure Municipal Authentication</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Platform Sign In</h1>
          <p className="text-xs text-slate-400">
            Select your assigned role to access your dedicated municipal workspace.
          </p>
        </div>

        {/* 5-Role Switcher Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1 overflow-x-auto scrollbar-none">
          {Object.entries(roleConfigs).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const isActive = activeRole === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveRole(key);
                  setErrorMessage('');
                }}
                className={`flex-1 min-w-[90px] py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[11px] leading-tight text-center whitespace-nowrap">{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Container */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">{config.label} Access</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {config.badge}
              </span>
            </div>
            <p className="text-xs text-slate-400">{config.description}</p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Official Email or Mobile Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. name@civic.gov or +91 98765 43210"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            {!useOtp ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setUseOtp(true)}
                    className="text-[11px] text-sky-400 hover:text-sky-300 underline"
                  >
                    Use SMS OTP instead
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Enter OTP</label>
                  <button
                    type="button"
                    onClick={() => setUseOtp(false)}
                    className="text-[11px] text-sky-400 hover:text-sky-300 underline"
                  >
                    Use Password instead
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP (Demo: 123456)"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-sky-500"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
                <span className="text-[11px] text-slate-500 font-mono block">Simulated OTP for demo testing: 123456</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md flex items-center justify-center space-x-2"
            >
              {loading ? <span>Verifying credentials...</span> : <span>Sign In as {config.label}</span>}
            </button>
          </form>

          {/* Quick Demo Helper for Hackathon Evaluation */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold uppercase text-slate-500">Hackathon Evaluator Shortcuts</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleQuickFill}
                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all text-center"
              >
                Pre-fill Credentials
              </button>
              <button
                type="button"
                onClick={handleInstantSwitch}
                disabled={loading}
                className="py-2 px-3 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 text-xs font-medium border border-indigo-500/30 transition-all text-center disabled:opacity-50"
              >
                1-Click Instant Login
              </button>
            </div>
            <div className="text-[11px] font-mono text-slate-500 text-center">
              Demo: <span className="text-slate-400">{config.demoEmail}</span> / <span className="text-slate-400">{config.demoPassword}</span>
            </div>
          </div>

          {/* Citizen Registration Link */}
          {activeRole === 'citizen' && (
            <div className="text-center pt-2 text-xs text-slate-400">
              Don't have a citizen account?{' '}
              <Link to="/register" className="text-sky-400 hover:text-sky-300 font-semibold underline">
                Register as Citizen
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    address: '',
    city: 'Mumbai',
    terms_accepted: false
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Client-side validations
    if (!formData.terms_accepted) {
      setErrorMessage('You must accept the Terms & Conditions to register.');
      return;
    }
    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters in length.');
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setErrorMessage('Password and Confirm Password do not match.');
      return;
    }
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please provide a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      await register({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        confirm_password: formData.confirm_password,
        address: formData.address.trim(),
        city: formData.city.trim(),
        terms_accepted: formData.terms_accepted
      });

      setSuccessMessage('Citizen account registered successfully! Redirecting to Citizen Dashboard...');
      setTimeout(() => {
        navigate('/citizen/dashboard');
      }, 1200);
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-8 px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 sm:p-10 space-y-6">
        <div className="text-center space-y-2 border-b border-slate-800 pb-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-950 text-sky-400 font-mono text-xs uppercase">
            <User className="w-3.5 h-3.5" />
            <span>Public Registration</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Create Citizen Account</h1>
          <p className="text-xs text-slate-400">
            Register to file municipal grievances, track resolution timelines, and receive verified SMS alerts.
          </p>
        </div>

        {/* Error / Success Feedback */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Full Name *</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="e.g. Aarav Sharma"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Mobile Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. +91 98765 43210"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. citizen@example.com"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Password * (min. 6 characters)</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Choose strong password"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Confirm Password *</label>
              <input
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="Re-enter password"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Residential / Local Address *</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g. Flat 402, Sunshine Heights, Linking Road, Bandra West"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">City / Jurisdiction *</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g. Mumbai"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-start space-x-2 cursor-pointer">
              <input
                type="checkbox"
                name="terms_accepted"
                checked={formData.terms_accepted}
                onChange={handleChange}
                className="mt-0.5 rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0"
              />
              <span className="text-xs text-slate-300">
                I agree to the municipal <strong className="text-white">Terms of Service</strong>, privacy policy, and fair usage guidelines for public grievance redressal.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md flex items-center justify-center space-x-2"
          >
            {loading ? <span>Creating citizen account...</span> : <span>Complete Registration & Sign In</span>}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-slate-400 border-t border-slate-800">
          Already have an account?{' '}
          <Link to="/login" className="text-sky-400 hover:text-sky-300 font-semibold underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
