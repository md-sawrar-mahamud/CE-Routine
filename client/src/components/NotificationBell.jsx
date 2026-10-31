import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_STYLES = {
  reminder: 'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800',
  digest: 'bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-800',
  urgent: 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800',
  system: 'bg-gray-50 border-gray-200 dark:bg-slate-800/60 dark:border-slate-700',
};

export default function NotificationBell() {
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifs(data);
    } catch (err) { /* silent, don't spam toasts on every poll */ }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifs.filter(n => !n.isRead).length;

  const markOneRead = async (id) => {
    setNotifs(notifs.map(n => n._id === id ? { ...n, isRead: true } : n));
    try { await api.patch(`/notifications/${id}/read`); } catch (err) { /* ignore */ }
  };

  const markAllRead = async () => {
    setNotifs(notifs.map(n => ({ ...n, isRead: true })));
    try {
      await api.patch('/notifications/read-all');
      toast.success('All marked as read');
    } catch (err) { toast.error('Failed to mark all read'); }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => setOpen(!open)} className="relative text-gray-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400">
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl shadow-lg border dark:border-slate-700 z-50"
          >
            <div className="flex justify-between items-center px-4 py-2 border-b dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900">
              <span className="font-semibold text-sm dark:text-slate-100">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                  Mark all read
                </button>
              )}
            </div>

            {notifs.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">No notifications yet</p>
            ) : (
              <div className="divide-y dark:divide-slate-700">
                {notifs.map(n => (
                  <div
                    key={n._id}
                    onClick={() => !n.isRead && markOneRead(n._id)}
                    className={`px-4 py-3 text-sm cursor-pointer border-l-4 dark:text-slate-200 ${TYPE_STYLES[n.type] || TYPE_STYLES.system} ${n.isRead ? 'opacity-60' : ''}`}
                  >
                    <div dangerouslySetInnerHTML={{ __html: n.message }} />
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}