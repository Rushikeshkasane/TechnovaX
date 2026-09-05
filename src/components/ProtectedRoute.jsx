import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { currentUser, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 px-4">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-sky-500 rounded-full animate-spin"></div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-200">Verifying Security Credentials</p>
          <p className="text-xs text-slate-400 mt-0.5">Validating municipal role session...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Redirect to login
  if (!isAuthenticated || !currentUser) {
    // Determine suggested role based on path
    let roleParam = '';
    if (location.pathname.startsWith('/officer')) roleParam = '?role=officer';
    else if (location.pathname.startsWith('/department')) roleParam = '?role=department_admin';
    else if (location.pathname.startsWith('/emergency')) roleParam = '?role=ert_responder';
    else if (location.pathname.startsWith('/admin')) roleParam = '?role=admin';
    else roleParam = '?role=citizen';

    return <Navigate to={`/login${roleParam}&redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Role validation
  const userRole = currentUser.role;
  const isAuthorized = allowedRoles.length === 0 || userRole === 'admin' || allowedRoles.includes(userRole);

  if (!isAuthorized) {
    const roleLabels = {
      citizen: 'Citizen Portal',
      officer: 'Field Officer Workspace',
      department_admin: 'Department Supervisor Console',
      ert_responder: 'Emergency CAD Board',
      admin: 'Citywide Administration'
    };

    const dashboardUrls = {
      citizen: '/citizen/dashboard',
      officer: '/officer/dashboard',
      department_admin: '/department/dashboard',
      ert_responder: '/emergency/dashboard',
      admin: '/admin/dashboard'
    };

    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-white">403 Access Denied</h2>
          <p className="text-sm text-slate-300 mt-2">
            Your authenticated account (<strong className="text-white">{currentUser.full_name}</strong>) has the role of{' '}
            <span className="font-mono text-sky-400 uppercase font-semibold">{currentUser.role}</span>.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            This workspace requires one of the following roles:{' '}
            <span className="font-mono text-amber-300 font-semibold">{allowedRoles.join(', ')}</span>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-800">
          <Link
            to={dashboardUrls[userRole] || '/'}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to My Dashboard ({roleLabels[userRole] || 'Home'})</span>
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all flex items-center justify-center space-x-2 border border-slate-700"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In with Different Role</span>
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
