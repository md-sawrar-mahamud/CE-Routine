import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import PageWrapper from '../components/PageWrapper';
import Logo from '../components/Logo';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.user.role);
      localStorage.setItem('batch', data.user.batch || '');
      localStorage.setItem('userId', data.user.id);
localStorage.setItem('mustChangePassword', data.user.mustChangePassword ? 'true' : 'false');
      toast.success(`Welcome back, ${data.user.fullName}!`);

      if (data.user.mustChangePassword) return navigate('/change-password');
      if (data.user.role === 'teacher') navigate('/teacher/dashboard');
      else if (['admin', 'moderator'].includes(data.user.role)) navigate('/admin/routine');
      else navigate('/student/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <PageWrapper>
      <div className="max-w-sm mx-auto mt-16 p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-slate-950/50 transition-colors">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-5"
        >
          <Logo size={72} showText={false} />
          <h1 className="text-2xl font-bold mt-3 text-gray-900 dark:text-slate-100">CE Routine Login</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Mymensingh Engineering College</p>
        </motion.div>

        <input
          className="border dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 p-2 w-full rounded mb-3"
          placeholder="Email"
          onChange={e => setForm({ ...form, email: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
        <input
          className="border dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 p-2 w-full rounded mb-4"
          type="password"
          placeholder="Password"
          onChange={e => setForm({ ...form, password: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />

        <motion.button whileTap={{ scale: 0.97 }} disabled={loading} onClick={handleLogin}
          className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-2 rounded-lg disabled:opacity-50 transition-colors">
          {loading ? 'Logging in...' : 'Login'}
        </motion.button>

        <div className="flex justify-between mt-4 text-sm">
          <a href="/register" className="text-indigo-600 dark:text-indigo-400">Register (Student)</a>
          <a href="/forgot-password" className="text-gray-500 dark:text-slate-400">Forgot password?</a>
        </div>
      </div>
    </PageWrapper>
  );
}