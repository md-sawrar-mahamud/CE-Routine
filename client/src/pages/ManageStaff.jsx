import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api';
import PageWrapper from '../components/PageWrapper';

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [batches, setBatches] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'moderator', batch: '' });
  const myId = localStorage.getItem('userId');

  const loadStaff = async () => {
    try {
      const { data } = await api.get('/admin/staff');
      setStaff(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load staff');
    }
  };

  const loadBatches = async () => {
    try {
      const { data } = await api.get('/batches');
      setBatches(data);
    } catch (err) {
      toast.error('Failed to load batches');
    }
  };

  useEffect(() => { loadStaff(); loadBatches(); }, []);

  const addBatch = async () => {
    if (!newBatchName.trim()) return toast.error('Enter a batch name');
    try {
      const { data } = await api.post('/batches', { name: newBatchName.trim() });
      toast.success('Batch added');
      setBatches([...batches, data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ ...form, batch: data.name });
      setNewBatchName('');
      setShowNewBatch(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add batch');
    }
  };

  const createStaff = async () => {
    if (!form.fullName || !form.email || !form.password) {
      return toast.error('Fill in name, email and password');
    }
    if (form.role === 'moderator' && !form.batch) {
      return toast.error('Please select a batch for this moderator');
    }
    setSaving(true);
    try {
      await api.post('/admin/create-staff', form);
      toast.success(`${form.role} account created`);
      setForm({ ...form, fullName: '', email: '', password: '' });
      loadStaff();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create account');
    }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this account? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('Account deleted');
      loadStaff();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto mt-10 px-4 pb-20 space-y-6">
        <h1 className="text-2xl font-bold ce-heading">🛡️ Manage Admins & Moderators</h1>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="ce-card p-5">
          <h2 className="font-semibold mb-3 ce-heading">➕ Add New Admin / Moderator</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input placeholder="Full Name" className="ce-input text-sm"
              value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
            <input placeholder="Email" type="email" className="ce-input text-sm"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Temporary Password (min 8 chars)" type="password" className="ce-input text-sm"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <select className="ce-input text-sm"
              value={form.role} onChange={e => setForm({ ...form, role: e.target.value, batch: '' })}>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {form.role === 'moderator' && (
            <div className="mt-3">
              <label className="text-xs ce-label block mb-1">Assign Batch (this moderator can only manage this batch)</label>
              <div className="flex gap-2">
                <select className="ce-input text-sm flex-1"
                  value={form.batch} onChange={e => setForm({ ...form, batch: e.target.value })}>
                  <option value="">-- Select Batch --</option>
                  {batches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                </select>
                <button type="button" onClick={() => setShowNewBatch(!showNewBatch)}
                  className="bg-gray-200 dark:bg-slate-700 dark:text-slate-200 px-3 rounded text-sm whitespace-nowrap">+ Add Batch</button>
              </div>

              {showNewBatch && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="flex gap-2 mt-2">
                  <input placeholder="New batch name (e.g. CE 10th Batch)" className="ce-input text-sm flex-1"
                    value={newBatchName} onChange={e => setNewBatchName(e.target.value)} />
                  <button type="button" onClick={addBatch}
                    className="bg-indigo-600 text-white px-3 rounded text-sm">Save</button>
                </motion.div>
              )}
            </div>
          )}

          <p className="text-xs ce-label mt-3">
            The new account must change this password on first login.
          </p>
          <motion.button whileTap={{ scale: 0.97 }} disabled={saving} onClick={createStaff}
            className="bg-green-600 text-white px-4 py-2 rounded mt-3 text-sm disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Account'}
          </motion.button>
        </motion.div>

        <div className="ce-card p-5">
          <h2 className="font-semibold mb-3 ce-heading">Current Admins & Moderators ({staff.length})</h2>
          <div className="max-h-96 overflow-y-auto border dark:border-slate-700 rounded">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800 text-left ce-label">
                  <th className="p-2">Name</th><th>Email</th><th>Role</th><th>Batch</th><th></th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s._id} className="border-t dark:border-slate-700">
                    <td className="p-2">{s.fullName}</td>
                    <td>{s.email}</td>
                    <td className="capitalize">
                      <span className={`text-xs px-2 py-1 rounded ${s.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'}`}>
                        {s.role}
                      </span>
                    </td>
                    <td className="text-xs ce-label">{s.batch || '—'}</td>
                    <td>
                      {s._id !== myId && (
                        <button onClick={() => remove(s._id)} className="text-red-500 text-xs">Remove</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}