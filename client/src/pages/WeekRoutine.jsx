import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PageWrapper from '../components/PageWrapper';
import api from '../api';

const DAYS = ['SUN','MON','TUE','WED','THU'];
const DAY_LABELS = { SUN: 'Sunday', MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday' };
const WEEKDAY_MAP = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

export default function WeekRoutine() {
  const role = localStorage.getItem('role');
  const batch = localStorage.getItem('batch') || '';
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const query = role === 'student' && batch ? `?batch=${encodeURIComponent(batch)}` : '';
        const { data } = await api.get(`/routine-slots${query}`);
        setSlots(data);
      } catch (err) {
        /* silent */
      }
      setLoading(false);
    };
    load();
  }, [role, batch]);

  const today = WEEKDAY_MAP[new Date().getDay()];

  const forDay = (day) => slots
    .filter(s => s.day === day)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto mt-8 px-4 pb-20">
        <h1 className="text-2xl font-bold mb-1 ce-heading">🗓️ Full Week Routine</h1>
        <p className="text-sm ce-label mb-6">
          {role === 'student' ? batch : role === 'teacher' ? 'Your classes this week' : 'All classes'}
        </p>

        {loading && <p className="ce-label text-sm">Loading...</p>}

        <div className="space-y-6">
          {DAYS.map(day => (
            <div key={day} className={`ce-card p-4 ${day === today ? 'ring-2 ring-indigo-400 dark:ring-indigo-500' : ''}`}>
              <h2 className="font-semibold mb-3 ce-heading flex items-center gap-2">
                {DAY_LABELS[day]}
                {day === today && (
                  <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Today</span>
                )}
              </h2>
              <div className="space-y-2">
                {forDay(day).length === 0 && (
                  <p className="text-sm ce-label italic">No classes</p>
                )}
                {forDay(day).map((s, i) => (
                  <motion.div key={s._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-sm bg-white/40 dark:bg-slate-900/40">
                    <span className="ce-label">
                      {s.isOneTime && (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 mr-1">
                          [One-time {new Date(s.oneTimeDate).toLocaleDateString()}]
                        </span>
                      )}
                      <strong className="ce-heading">{s.courseId?.code}</strong> — {s.courseId?.name} | ⏰ {s.startTime}-{s.endTime} | 🏫 Room {s.roomNo || 'TBA'}
                      {role !== 'teacher' && s.teacherId?.fullName ? ` | 👨‍🏫 ${s.teacherId.fullName}` : ''}
                      {role === 'teacher' ? ` | ${s.batch}` : ''}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}