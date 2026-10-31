import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';
import PageWrapper from '../components/PageWrapper';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async () => {
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        id: params.get('id'), token: params.get('token'), newPassword
      });
      toast.success('Password reset! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed');
    }
    setLoading(false);
  };

  return (
    <PageWrapper>
      <div className="max-w-sm mx-auto mt-24 p-6 ce-card">
        <h1 className="text-xl font-bold mb-4 ce-heading">Reset Password</h1>
        <input type="password" className="ce-input mb-4" placeholder="New password"
          onChange={e => setNewPassword(e.target.value)} />
        <motion.button whileTap={{ scale: 0.97 }} disabled={loading} onClick={submit}
          className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-2 rounded-lg disabled:opacity-50 transition-colors">
          {loading ? 'Resetting...' : 'Reset Password'}
        </motion.button>
      </div>
    </PageWrapper>
  );
}