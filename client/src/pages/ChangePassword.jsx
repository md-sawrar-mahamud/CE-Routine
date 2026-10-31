import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import PageWrapper from '../components/PageWrapper';

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async () => {
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        userId: localStorage.getItem('userId'), oldPassword, newPassword
      });
      toast.success('Password changed!');
localStorage.setItem('mustChangePassword', 'false');
      const role = localStorage.getItem('role');
      if (role === 'teacher') navigate('/teacher/dashboard');
      else navigate('/admin/routine');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
    setLoading(false);
  };

  return (
    <PageWrapper>
      <div className="max-w-sm mx-auto mt-24 p-6 ce-card">
        <h1 className="text-xl font-bold mb-1 ce-heading">Change Password</h1>
        <p className="text-sm ce-label mb-4">You must set a new password before continuing.</p>
        <input type="password" placeholder="Current (temp) password"
          className="ce-input mb-3" onChange={e => setOldPassword(e.target.value)} />
        <input type="password" placeholder="New password"
          className="ce-input mb-4" onChange={e => setNewPassword(e.target.value)} />
        <motion.button whileTap={{ scale: 0.97 }} disabled={loading} onClick={submit}
          className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-2 rounded-lg disabled:opacity-50 transition-colors">
          {loading ? 'Saving...' : 'Save Password'}
        </motion.button>
      </div>
    </PageWrapper>
  );
}