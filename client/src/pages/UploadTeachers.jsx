import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api';
import PageWrapper from '../components/PageWrapper';

export default function UploadTeachers() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const role = localStorage.getItem('role');

  const loadList = async () => {
    try {
      const { data } = await api.get('/admin/teachers');
      setList(data);
    } catch (err) {
      toast.error('Failed to load teacher list');
    }
  };

  useEffect(() => { loadList(); }, []);

  const submit = async () => {
    if (!file) return toast.error('Choose a CSV file first');
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/admin/upload-teachers', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(data);
      toast.success(`${data.createdCount} teachers created & emailed`);
      loadList();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    }
    setLoading(false);
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('Teacher removed');
      loadList();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove (admin only)');
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto mt-10 p-6 ce-card">
        <h1 className="text-xl font-bold mb-2 ce-heading">Upload Teacher List (CE)</h1>
        <p className="text-sm ce-label mb-4">
          CSV columns: <code>full_name, email, phone, designation</code>
        </p>
        <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])}
          className="ce-input mb-4" />
        <motion.button whileTap={{ scale: 0.95 }} disabled={loading} onClick={submit}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded w-full disabled:opacity-50 transition-colors">
          {loading ? 'Uploading & Sending Emails...' : 'Upload & Create Accounts'}
        </motion.button>

        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-sm">
            <p className="text-green-600 dark:text-green-400">✅ {result.createdCount} teachers created & emailed</p>
            {result.failed?.length > 0 && (
              <div className="text-red-500 dark:text-red-400 mt-2">
                <p>⚠️ {result.failed.length} failed:</p>
                <ul className="list-disc ml-5">
                  {result.failed.map((f, i) => <li key={i}>{f.email || f.full_name}: {f.reason}</li>)}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        <h2 className="font-semibold mt-6 mb-2 ce-heading">Teachers ({list.length})</h2>
        <div className="max-h-64 overflow-y-auto border dark:border-slate-700 rounded">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800 text-left ce-label">
                <th className="p-2">Name</th><th>Email</th><th>Designation</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {list.map(t => (
                <tr key={t._id} className="border-t dark:border-slate-700">
                  <td className="p-2">{t.fullName}</td>
                  <td>{t.email}</td>
                  <td>{t.designation || '-'}</td>
                  <td>{t.mustChangePassword ? '⏳ Pending setup' : '✅ Active'}</td>
                  <td>
                    {role === 'admin' && (
                      <button onClick={() => remove(t._id)} className="text-red-500 text-xs">Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  );
}