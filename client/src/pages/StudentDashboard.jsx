import { motion } from 'framer-motion';
import PageWrapper from '../components/PageWrapper';
import useLiveClasses from '../hooks/useLiveClasses';
import ExternalTools from '../components/ExternalTools';

const statusStyle = {
  confirmed: 'bg-green-50 dark:bg-green-950/40 border-green-400 dark:border-green-700 text-green-700 dark:text-green-300',
  cancelled: 'bg-red-50 dark:bg-red-950/40 border-red-400 dark:border-red-700 text-red-700 dark:text-red-300',
  postponed: 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300',
  rescheduled: 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300',
  scheduled: 'bg-gray-50 dark:bg-slate-800/60 border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300'
};

export default function StudentDashboard() {
  const today = new Date().toISOString().split('T')[0];
  const batch = localStorage.getItem('batch') || 'CE 9th Batch';
  const [classes] = useLiveClasses(today, batch);

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto mt-8 px-4 pb-20">
        <h1 className="text-2xl font-bold mb-1 ce-heading">📅 Today's Routine</h1>
        <p className="text-sm ce-label mb-6">{batch}</p>

        <ExternalTools />

        <a href="/week-routine"
          className="block text-center bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg mb-6 text-sm font-medium transition-colors">
          🗓️ View Full Week Routine
        </a>

        <div className="space-y-3">
          {classes.map((c, i) => (
            <motion.div
              key={c._id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`border-l-4 p-4 rounded-lg shadow-sm ${statusStyle[c.status]}`}
            >
              <p className="font-semibold">{c.routineSlotId?.courseId?.code} — {c.routineSlotId?.courseId?.name}</p>
              <p className="text-sm">⏰ {c.actualStartTime || c.routineSlotId?.startTime} | 🏫 Room {c.actualRoom || c.routineSlotId?.roomNo}</p>
              <p className="text-xs uppercase font-bold mt-1">{c.status}</p>
              {c.note && <p className="text-xs italic mt-1">Note: {c.note}</p>}
            </motion.div>
          ))}
          {classes.length === 0 && <p className="text-gray-400 dark:text-slate-500 text-center mt-10">No classes today 🎉</p>}
        </div>
      </div>
    </PageWrapper>
  );
}