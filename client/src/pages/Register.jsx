import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import PageWrapper from '../components/PageWrapper';
import Logo from '../components/Logo';

export default function Register() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', regNo: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async () => {
    setLoading(true);
    try {
      await api.post('/auth/register-student', form);
      toast.success('Registered! You can login now.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <PageWrapper>
      <div className="max-w-sm mx-auto mt-12 p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-slate-950/50 transition-colors">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-4"
        >
          <Logo size={64} showText={false} />
          <h1 className="text-xl font-bold mt-3 text-gray-900 dark:text-slate-100">Student Registration</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 text-center mt-1">
            Only pre-approved registration numbers can sign up.
          </p>
        </motion.div>

        {['fullName', 'regNo', 'email', 'password'].map(f => (
          <input
            key={f}
            type={f === 'password' ? 'password' : 'text'}
            className="border dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 p-2 w-full rounded mb-3"
            placeholder={f}
            onChange={e => setForm({ ...form, [f]: e.target.value })}
          />
        ))}
        <motion.button whileTap={{ scale: 0.97 }} disabled={loading} onClick={submit}
          className="bg-green-600 hover:bg-green-700 text-white w-full py-2 rounded-lg disabled:opacity-50 transition-colors">
          {loading ? 'Registering...' : 'Register'}
        </motion.button>
        <a href="/login" className="block text-center text-sm text-indigo-600 dark:text-indigo-400 mt-4">← Back to login</a>
      </div>
    </PageWrapper>
  );
}