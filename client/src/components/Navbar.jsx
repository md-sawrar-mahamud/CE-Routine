import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const [logoError, setLogoError] = useState(false);

  const links = {
    admin: [
      { to: '/admin/routine', label: 'Routine' },
      { to: '/admin/staff', label: 'Manage Staff' },
      { to: '/admin/upload-teachers', label: 'Upload Teachers' },
      { to: '/admin/upload-students', label: 'Upload Students' },
    ],
    moderator: [
      { to: '/admin/routine', label: 'Routine' },
      { to: '/admin/upload-teachers', label: 'Upload Teachers' },
      { to: '/admin/upload-students', label: 'Upload Students' },
    ],
    teacher: [
      { to: '/teacher/dashboard', label: 'My Classes' },
      { to: '/week-routine', label: 'Full Week' },
    ],
    student: [
      { to: '/student/dashboard', label: 'My Routine' },
      { to: '/week-routine', label: 'Full Week' },
    ],
  };

  const routineHome =
    role === 'admin' || role === 'moderator'
      ? '/admin/routine'
      : role === 'teacher'
      ? '/teacher/dashboard'
      : role === 'student'
      ? '/student/dashboard'
      : '/login';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const navLinks = links[role] || [];

  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/90 backdrop-blur border-b border-gray-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between gap-3">
      {/* Logo + title block -> links to routine page */}
      <Link to={routineHome} className="flex items-center gap-2 shrink-0 group">
        {!logoError ? (
          <img
            src="/logo.png"
            alt="Mymensingh Engineering College logo"
            className="w-10 h-10 object-contain rounded-full bg-white/70 dark:bg-slate-800 p-0.5 shrink-0"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg shrink-0">
            🏛️
          </div>
        )}
        <div className="leading-tight">
          <p className="font-bold text-indigo-700 dark:text-indigo-300 text-sm sm:text-base group-hover:underline">
            Mymensingh Engineering College
          </p>
          <p className="hidden sm:block text-xs text-gray-600 dark:text-slate-400">
            Department of Civil Engineering
          </p>
          <p className="hidden sm:block text-[11px] text-gray-500 dark:text-slate-500 italic">
            Daily class routine updates
          </p>
        </div>
      </Link>

      {/* Role-based nav links */}
      <div className="hidden md:flex items-center gap-4 flex-1 justify-center">
        {navLinks.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="text-sm font-medium text-gray-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            {l.label}
          </Link>
        ))}
        {role && (
          <Link
            to="/profile"
            className="text-sm font-medium text-gray-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            Profile
          </Link>
        )}
      </div>

      {/* Right side: mobile links + bell + theme + logout */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex md:hidden items-center gap-3">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-xs font-medium text-gray-700 dark:text-slate-300"
            >
              {l.label}
            </Link>
          ))}
        </div>
        {role && <NotificationBell />}
        <ThemeToggle />
        {role && (
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}