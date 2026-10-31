import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import PageWrapper from '../components/PageWrapper';
import useLiveClasses from '../hooks/useLiveClasses';
import api from '../api';
import ExternalTools from '../components/ExternalTools';

export default function TeacherDashboard() {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  const [classes, refetch] = useLiveClasses(tomorrow, null);
  const [loadingId, setLoadingId] = useState(null);
  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ actualStartTime: '', actualEndTime: '', actualRoom: '' });

  const [mySlots, setMySlots] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    routineSlotId: '', date: today, actualStartTime: '', actualEndTime: '', actualRoom: '', note: '',
    notifyNow: false, allowConflict: false
  });
  const [addLoading, setAddLoading] = useState(false);

  const loadMySlots = async () => {
    try {
      const { data } = await api.get('/routine-slots');
      setMySlots(data);
    } catch (err) { /* silent */ }
  };

  useEffect(() => { loadMySlots(); }, []);

  const submitUpdate = async (id, payload) => {
    setLoadingId(id);
    try {
      const { data } = await api.patch(`/class-instances/${id}`, payload);
      toast.success(`Class ${payload.status}${data.urgent ? ' — ⚠️ urgent alert sent to students!' : ''}`);
      setRescheduleId(null);
      refetch();
    } catch (err) {
      if (err.response?.status === 409) {
        const conflicts = err.response.data.conflicts || [];
        const details = conflicts.map(c =>
          `${c.course} (${c.teacher || 'Unknown teacher'}) — ${c.startTime}-${c.endTime} in Room ${c.room} [${c.status}]`
        ).join('\n');
        const proceed = window.confirm(`⚠️ Conflict detected!\n\n${details}\n\nDo you want to proceed anyway?`);
        if (proceed) return submitUpdate(id, { ...payload, force: true });
        else toast.error('Action cancelled due to conflict');
      } else {
        toast.error(err.response?.data?.error || 'Failed');
      }
    }
    setLoadingId(null);
  };

  const act = (id, status) => submitUpdate(id, { status });

  const openReschedule = (c) => {
    setRescheduleId(c._id);
    setRescheduleForm({
      actualStartTime: c.actualStartTime || c.routineSlotId?.startTime || '',
      actualEndTime: c.actualEndTime || c.routineSlotId?.endTime || '',
      actualRoom: c.actualRoom || c.routineSlotId?.roomNo || ''
    });
  };

  const submitReschedule = (id) => {
    if (!rescheduleForm.actualStartTime || !rescheduleForm.actualEndTime || !rescheduleForm.actualRoom) {
      return toast.error('Fill in start time, end time, and room');
    }
    submitUpdate(id, { status: 'rescheduled', ...rescheduleForm });
  };

  const onSelectSlotForAdd = (slotId) => {
    const slot = mySlots.find(s => s._id === slotId);
    setAddForm({
      ...addForm,
      routineSlotId: slotId,
      actualStartTime: slot?.startTime || '',
      actualEndTime: slot?.endTime || '',
      actualRoom: slot?.roomNo || ''
    });
  };

  const submitAddClass = async (force = false) => {
    if (!addForm.routineSlotId) return toast.error('Choose a course');
    if (!addForm.date) return toast.error('Choose a date');
    if (!addForm.actualStartTime || !addForm.actualEndTime || !addForm.actualRoom) {
      return toast.error('Fill in start time, end time, and room');
    }
    setAddLoading(true);
    try {
      await api.post('/class-instances', { ...addForm, force });
      toast.success('Class added');
      setShowAddForm(false);
      setAddForm({ routineSlotId: '', date: today, actualStartTime: '', actualEndTime: '', actualRoom: '', note: '', notifyNow: false, allowConflict: false });
      if (addForm.date === tomorrow) refetch();
    } catch (err) {
      if (err.response?.status === 409) {
        const conflicts = err.response.data.conflicts || [];
        const details = conflicts.map(c =>
          `${c.course} (${c.teacher || 'Unknown teacher'}) — ${c.startTime}-${c.endTime} in Room ${c.room} [${c.status}]`
        ).join('\n');
        const proceed = window.confirm(`⚠️ Conflict detected!\n\n${details}\n\nDo you want to proceed anyway?`);
        if (proceed) return submitAddClass(true);
        else toast.error('Add class cancelled due to conflict');
      } else {
        toast.error(err.response?.data?.error || 'Failed to add class');
      }
    }
    setAddLoading(false);
  };

  const statusColor = {
    scheduled: 'text-gray-500 dark:text-slate-400', confirmed: 'text-green-600 dark:text-green-400',
    cancelled: 'text-red-600 dark:text-red-400', postponed: 'text-yellow-600 dark:text-yellow-400', rescheduled: 'text-blue-600 dark:text-blue-400'
  };

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto mt-8 px-4 pb-20">
        <h1 className="text-2xl font-bold mb-1 ce-heading">Tomorrow's Classes</h1>
        <p className="text-sm ce-label mb-6">{tomorrow}</p>

        <ExternalTools />

        <a href="/week-routine"
          className="block text-center bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg mb-6 text-sm font-medium transition-colors">
          🗓️ View Full Week Routine
        </a>

        {/* Add Class for Today */}
        <div className="ce-card p-4 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold ce-heading">➕ Add a Class</h2>
            <button onClick={() => setShowAddForm(!showAddForm)}
              className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">
              {showAddForm ? 'Close' : 'Add New'}
            </button>
          </div>

          <AnimatePresence>
            {showAddForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-2">
                <select className="ce-input text-sm"
                  value={addForm.routineSlotId}
                  onChange={e => onSelectSlotForAdd(e.target.value)}>
                  <option value="">-- Select your course --</option>
                  {mySlots.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.courseId?.code} - {s.courseId?.name} ({s.day}, {s.batch})
                    </option>
                  ))}
                </select>

                <input type="date" className="ce-input text-sm" min={today}
                  value={addForm.date}
                  onChange={e => setAddForm({ ...addForm, date: e.target.value })} />

                <div className="grid grid-cols-3 gap-2">
                  <input type="time" className="ce-input text-sm"
                    value={addForm.actualStartTime}
                    onChange={e => setAddForm({ ...addForm, actualStartTime: e.target.value })} />
                  <input type="time" className="ce-input text-sm"
                    value={addForm.actualEndTime}
                    onChange={e => setAddForm({ ...addForm, actualEndTime: e.target.value })} />
                  <input placeholder="Room" className="ce-input text-sm"
                    value={addForm.actualRoom}
                    onChange={e => setAddForm({ ...addForm, actualRoom: e.target.value })} />
                </div>

                <input placeholder="Note (optional)" className="ce-input text-sm"
                  value={addForm.note}
                  onChange={e => setAddForm({ ...addForm, note: e.target.value })} />

                <label className="flex items-center gap-2 text-sm ce-label">
                  <input type="checkbox" checked={addForm.notifyNow}
                    onChange={e => setAddForm({ ...addForm, notifyNow: e.target.checked })} />
                  Notify students immediately
                </label>
                <label className="flex items-center gap-2 text-sm ce-label">
                  <input type="checkbox" checked={addForm.allowConflict}
                    onChange={e => setAddForm({ ...addForm, allowConflict: e.target.checked })} />
                  Allow even if room/time conflict
                </label>

                <motion.button whileTap={{ scale: 0.97 }} disabled={addLoading}
                  onClick={() => submitAddClass(addForm.allowConflict)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50 transition-colors">
                  {addLoading ? 'Adding...' : 'Add Class'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tomorrow's classes list */}
        <h2 className="font-semibold mb-2 ce-heading">📘 Your Classes ({classes.length})</h2>
        <div className="space-y-3">
          {classes.length === 0 && (
            <p className="text-sm ce-label">No classes scheduled for tomorrow.</p>
          )}

          {classes.map(c => (
            <motion.div key={c._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="ce-card p-4">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-medium ce-heading">
                    {c.routineSlotId?.courseId?.code} - {c.routineSlotId?.courseId?.name}
                  </p>
                  <p className="text-xs ce-label">
                    {c.routineSlotId?.batch} | {c.actualStartTime || c.routineSlotId?.startTime}-{c.actualEndTime || c.routineSlotId?.endTime} | Room {c.actualRoom || c.routineSlotId?.roomNo}
                  </p>
                  {c.note && <p className="text-xs italic ce-label mt-1">Note: {c.note}</p>}
                </div>
                <span className={`text-xs font-semibold uppercase whitespace-nowrap ${statusColor[c.status]}`}>
                  {c.status}
                </span>
              </div>

              {rescheduleId === c._id ? (
                <div className="mt-3 space-y-2 bg-blue-50 dark:bg-blue-950/40 p-3 rounded">
                  <div className="grid grid-cols-3 gap-2">
                    <input type="time" className="ce-input text-sm" value={rescheduleForm.actualStartTime}
                      onChange={e => setRescheduleForm({ ...rescheduleForm, actualStartTime: e.target.value })} />
                    <input type="time" className="ce-input text-sm" value={rescheduleForm.actualEndTime}
                      onChange={e => setRescheduleForm({ ...rescheduleForm, actualEndTime: e.target.value })} />
                    <input placeholder="Room" className="ce-input text-sm" value={rescheduleForm.actualRoom}
                      onChange={e => setRescheduleForm({ ...rescheduleForm, actualRoom: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <motion.button whileTap={{ scale: 0.97 }} disabled={loadingId === c._id}
                      onClick={() => submitReschedule(c._id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50">
                      Confirm Reschedule
                    </motion.button>
                    <button onClick={() => setRescheduleId(null)} className="text-sm ce-label">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 mt-3">
                  <motion.button whileTap={{ scale: 0.97 }} disabled={loadingId === c._id}
                    onClick={() => act(c._id, 'confirmed')}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50">
                    Confirm
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} disabled={loadingId === c._id}
                    onClick={() => act(c._id, 'postponed')}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50">
                    Postpone
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} disabled={loadingId === c._id}
                    onClick={() => act(c._id, 'cancelled')}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50">
                    Cancel
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} disabled={loadingId === c._id}
                    onClick={() => openReschedule(c)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50">
                    Reschedule
                  </motion.button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}