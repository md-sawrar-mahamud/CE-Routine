import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api';
import PageWrapper from '../components/PageWrapper';
import { CE_COURSE_CATALOG } from '../data/ceCourseCatalog';
import ExternalTools from '../components/ExternalTools';
import OcrRoutineImport from '../components/OcrRoutineImport';

const DAYS = ['SUN','MON','TUE','WED','THU'];

export default function AdminRoutine() {
  const role = localStorage.getItem('role');
  const myBatch = localStorage.getItem('batch') || '';
  const isModerator = role === 'moderator';

  const [slots, setSlots] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');

  const [form, setForm] = useState({
    day: 'SUN', startTime: '', endTime: '', courseId: '', teacherId: '', roomNo: '',
    batch: isModerator ? myBatch : '',
    repeatWeekly: true, oneTimeDate: '',
    notifyNow: false, allowConflict: false
  });
  const [courseForm, setCourseForm] = useState({ code: '', name: '', credit: 3, teacherId: '', batch: isModerator ? myBatch : '' });

  const load = async () => {
    const [slotsRes, coursesRes, teachersRes, batchesRes] = await Promise.all([
      api.get('/routine-slots'),
      api.get('/courses'),
      api.get('/admin/teachers'),
      api.get('/batches')
    ]);
    setSlots(slotsRes.data);
    setCourses(coursesRes.data);
    setTeachers(teachersRes.data);
    setBatches(batchesRes.data);
  };

  useEffect(() => { load(); }, []);

  const addBatch = async () => {
    if (!newBatchName.trim()) return toast.error('Enter a batch name');
    try {
      const { data } = await api.post('/batches', { name: newBatchName.trim() });
      toast.success('Batch added');
      setBatches([...batches, data].sort((a, b) => a.name.localeCompare(b.name)));
      setCourseForm({ ...courseForm, batch: data.name });
      setNewBatchName('');
      setShowNewBatch(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add batch'); }
  };

  const addCourse = async () => {
    if (!courseForm.batch) return toast.error('Please select a batch');
    try {
      await api.post('/courses', courseForm);
      toast.success('Course added');
      load();
    } catch (err) { toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to add course'); }
  };

  const addSlot = async (force = false) => {
    if (!form.batch) return toast.error('Please select a batch');
    if (!form.repeatWeekly && !form.oneTimeDate) return toast.error('Pick a date for a one-time class');

    const payload = {
      day: form.day,
      startTime: form.startTime,
      endTime: form.endTime,
      courseId: form.courseId,
      teacherId: form.teacherId,
      roomNo: form.roomNo,
      batch: form.batch,
      isOneTime: !form.repeatWeekly,
      oneTimeDate: form.repeatWeekly ? undefined : form.oneTimeDate,
      notifyNow: form.notifyNow,
      force: force || form.allowConflict
    };

    try {
      await api.post('/routine-slots', payload);
      toast.success('Slot added');
      setForm({ ...form, startTime: '', endTime: '', courseId: '', teacherId: '', roomNo: '', oneTimeDate: '' });
      load();
    } catch (err) {
      if (err.response?.status === 409) {
        const conflicts = err.response.data.conflicts || [];
        const details = conflicts.map(c =>
          `${c.course || 'Unknown course'} (${c.teacher || 'Unknown teacher'}) — ${c.when} ${c.startTime}-${c.endTime}`
        ).join('\n');
        const proceed = window.confirm(`⚠️ Conflict detected!\n\n${details}\n\nCreate anyway?`);
        if (proceed) return addSlot(true);
        else toast.error('Cancelled due to conflict');
      } else {
        toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to add slot');
      }
    }
  };

  const deleteSlot = async (id) => {
    await api.delete(`/routine-slots/${id}`);
    toast.success('Slot deleted');
    load();
  };

  const BatchPicker = ({ value, onChange }) => {
    if (isModerator) {
      return (
        <input disabled value={myBatch} className="border dark:border-slate-700 p-2 rounded text-sm bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400" />
      );
    }
    return (
      <div className="flex gap-2 col-span-2">
        <select className="ce-input text-sm flex-1" value={value} onChange={e => onChange(e.target.value)}>
          <option value="">-- Select Batch --</option>
          {batches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
        </select>
        <button type="button" onClick={() => setShowNewBatch(!showNewBatch)}
          className="bg-gray-200 dark:bg-slate-700 dark:text-slate-200 px-3 rounded text-sm whitespace-nowrap">+ Add Batch</button>
      </div>
    );
  };

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto mt-8 px-4 pb-20">
        <h1 className="text-2xl font-bold mb-6 ce-heading">Routine Management (CE)</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <a href="/admin/upload-teachers" className="bg-purple-600 text-white p-4 rounded-lg text-center hover:opacity-90">👨‍🏫 Upload Teachers</a>
          <a href="/admin/upload-students" className="bg-indigo-600 text-white p-4 rounded-lg text-center hover:opacity-90">🎓 Upload Students</a>
        </div>

        <ExternalTools />

        <OcrRoutineImport
          courses={courses}
          teachers={teachers}
          batches={batches}
          isModerator={isModerator}
          myBatch={myBatch}
          onImported={load}
        />

        {!isModerator && showNewBatch && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="flex gap-2 mb-4">
            <input placeholder="New batch name (e.g. CE 21st Batch)" className="ce-input text-sm flex-1"
              value={newBatchName} onChange={e => setNewBatchName(e.target.value)} />
            <button type="button" onClick={addBatch}
              className="bg-indigo-600 text-white px-3 rounded text-sm">Save</button>
          </motion.div>
        )}

        {/* Add Course */}
        <div className="ce-card p-5 mb-6">
          <h2 className="font-semibold mb-3 ce-heading">➕ Add Course</h2>
          <select
            className="ce-input text-sm mb-3"
            defaultValue=""
            onChange={e => {
              const found = CE_COURSE_CATALOG.find(c => c.code === e.target.value);
              if (found) {
                setCourseForm({ ...courseForm, code: found.code, name: found.name, credit: found.credit });
              }
            }}
          >
            <option value="" disabled>📚 Auto-select course from CE syllabus...</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
              <optgroup key={sem} label={`Semester ${sem}`}>
                {CE_COURSE_CATALOG.filter(c => c.semester === sem).map(c => (
                  <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                ))}
              </optgroup>
            ))}
          </select>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <input placeholder="Code (CE301)" className="ce-input text-sm"
              value={courseForm.code}
              onChange={e => setCourseForm({ ...courseForm, code: e.target.value })} />
            <input placeholder="Name" className="ce-input text-sm"
              value={courseForm.name}
              onChange={e => setCourseForm({ ...courseForm, name: e.target.value })} />
            <input placeholder="Credit" type="number" step="0.5" className="ce-input text-sm"
              value={courseForm.credit}
              onChange={e => setCourseForm({ ...courseForm, credit: e.target.value })} />
            <BatchPicker value={courseForm.batch} onChange={(v) => setCourseForm({ ...courseForm, batch: v })} />
            <select className="ce-input text-sm"
              value={courseForm.teacherId}
              onChange={e => setCourseForm({ ...courseForm, teacherId: e.target.value })}>
              <option value="">Teacher</option>
              {teachers.map(t => <option key={t._id} value={t._id}>{t.fullName}</option>)}
            </select>
          </div>
          <motion.button whileTap={{ scale: 0.97 }} onClick={addCourse}
            className="bg-green-600 text-white px-4 py-2 rounded mt-3 text-sm">Add Course</motion.button>
        </div>

        {/* Add Routine Slot */}
        <div className="ce-card p-5 mb-6">
          <h2 className="font-semibold mb-3 ce-heading">➕ Add Weekly Slot</h2>

          <label className="flex items-center gap-2 text-sm ce-label mb-3">
            <input type="checkbox" checked={form.repeatWeekly}
              onChange={e => setForm({ ...form, repeatWeekly: e.target.checked })} />
            Repeat every week
          </label>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {form.repeatWeekly ? (
              <select className="ce-input text-sm"
                value={form.day}
                onChange={e => setForm({ ...form, day: e.target.value })}>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            ) : (
              <input type="date" className="ce-input text-sm"
                value={form.oneTimeDate}
                onChange={e => setForm({ ...form, oneTimeDate: e.target.value })} />
            )}
            <input type="time" className="ce-input text-sm"
              value={form.startTime}
              onChange={e => setForm({ ...form, startTime: e.target.value })} />
            <input type="time" className="ce-input text-sm"
              value={form.endTime}
              onChange={e => setForm({ ...form, endTime: e.target.value })} />
            <input placeholder="Room" className="ce-input text-sm"
              value={form.roomNo}
              onChange={e => setForm({ ...form, roomNo: e.target.value })} />
            <select className="ce-input text-sm col-span-2"
              value={form.courseId}
              onChange={e => setForm({ ...form, courseId: e.target.value })}>
              <option value="">Course</option>
              {courses
                .filter(c => !isModerator || c.batch === myBatch)
                .map(c => <option key={c._id} value={c._id}>{c.code} - {c.name}</option>)}
            </select>
            <select className="ce-input text-sm col-span-2"
              value={form.teacherId}
              onChange={e => setForm({ ...form, teacherId: e.target.value })}>
              <option value="">Teacher</option>
              {teachers.map(t => <option key={t._id} value={t._id}>{t.fullName}</option>)}
            </select>
            <div className="col-span-2 md:col-span-4">
              <label className="text-xs ce-label block mb-1">Batch</label>
              <BatchPicker value={form.batch} onChange={(v) => setForm({ ...form, batch: v })} />
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-3">
            <label className="flex items-center gap-2 text-sm ce-label">
              <input type="checkbox" checked={form.notifyNow}
                onChange={e => setForm({ ...form, notifyNow: e.target.checked })} />
              Notify students immediately
            </label>
            <label className="flex items-center gap-2 text-sm ce-label">
              <input type="checkbox" checked={form.allowConflict}
                onChange={e => setForm({ ...form, allowConflict: e.target.checked })} />
              Allow even if room/time conflict
            </label>
          </div>

          <motion.button whileTap={{ scale: 0.97 }} onClick={() => addSlot(false)}
            className="bg-indigo-600 text-white px-4 py-2 rounded mt-3 text-sm">Add Slot</motion.button>
        </div>

        {/* Slot list */}
        <h2 className="font-semibold mb-2 ce-heading">📋 Weekly Slots ({slots.filter(s => !isModerator || s.batch === myBatch).length})</h2>
        <div className="space-y-2">
          {slots
            .filter(s => !isModerator || s.batch === myBatch)
            .map((s, i) => (
            <motion.div key={s._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="ce-card p-3 flex justify-between items-center text-sm">
              <span className="ce-label">
                {s.isOneTime ? (
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 mr-1">
                    [One-time {new Date(s.oneTimeDate).toLocaleDateString()}]
                  </span>
                ) : null}
                {s.day} | {s.courseId?.code} | {s.startTime}-{s.endTime} | Room {s.roomNo} | {s.teacherId?.fullName} | {s.batch}
              </span>
              <button onClick={() => deleteSlot(s._id)} className="text-red-500 text-xs">Delete</button>
            </motion.div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}