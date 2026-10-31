import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api';
import PageWrapper from '../components/PageWrapper';

export default function UploadStudents() {
  const role = localStorage.getItem('role');
  const myBatch = localStorage.getItem('batch') || '';
  const isModerator = role === 'moderator';

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [batches, setBatches] = useState([]);
  const [filterBatch, setFilterBatch] = useState('');

  const loadList = async () => {
    const { data } = await api.get('/admin/allowed-students');
    setList(data);
  };

  const loadBatches = async () => {
    try {
      const { data } = await api.get('/batches');
      setBatches(data);
    } catch (err) { /* ignore, not critical for this page */ }
  };

  useEffect(() => { loadList(); loadBatches(); }, []);

  const submit = async () => {
    if (!file) return toast.error('Choose a CSV file first');
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/admin/upload-students', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`${data.uploaded} students uploaded`);
      loadList();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    }
    setLoading(false);
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/allowed-students/${id}`);
      toast.success('Student removed');
      loadList();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove');
    }
  };

  const displayedList = isModerator
    ? list
    : (filterBatch ? list.filter(s => s.batch === filterBatch) : list);

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto mt-10 p-6 ce-card">
        <h1 className="text-xl font-bold mb-2 ce-heading">Upload Approved Student List</h1>

        {isModerator ? (
          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-sm rounded-lg p-3 mb-4">
            📌 You are a moderator for <b>{myBatch || 'no batch assigned'}</b>. All uploaded students
            will be added to this batch — any <code>batch</code> column in your CSV will be ignored.
          </div>
        ) : (
          <p className="text-sm ce-label mb-4">
            CSV columns: <code>reg_no, full_name, session, batch</code>
          </p>
        )}

        <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])}
          className="ce-input mb-4" />
        <motion.button whileTap={{ scale: 0.97 }} disabled={loading} onClick={submit}
          className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-2 rounded-lg disabled:opacity-50 transition-colors">
          {loading ? 'Uploading...' : 'Upload List'}
        </motion.button>

        <div className="flex items-center justify-between mt-6 mb-2">
          <h2 className="font-semibold ce-heading">
            {isModerator ? `Approved List — ${myBatch} (${displayedList.length})` : `Approved List (${displayedList.length})`}
          </h2>
          {!isModerator && (
            <select className="ce-input text-xs w-auto"
              value={filterBatch} onChange={e => setFilterBatch(e.target.value)}>
              <option value="">All Batches</option>
              {batches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
            </select>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto border dark:border-slate-700 rounded">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-slate-800 text-left ce-label"><th className="p-2">Reg No</th><th>Name</th><th>Batch</th><th>Used?</th><th></th></tr></thead>
            <tbody>
              {displayedList.map(s => (
                <tr key={s._id} className="border-t dark:border-slate-700">
                  <td className="p-2">{s.regNo}</td><td>{s.fullName}</td><td>{s.batch}</td>
                  <td>{s.isUsed ? '✅' : '⏳'}</td>
                  <td><button onClick={() => remove(s._id)} className="text-red-500 text-xs">Remove</button></td>
                </tr>
              ))}
              {displayedList.length === 0 && (
                <tr><td colSpan="5" className="p-3 text-center text-gray-400 dark:text-slate-500">No students found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  );
}