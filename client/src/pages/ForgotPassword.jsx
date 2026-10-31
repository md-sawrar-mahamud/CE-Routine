import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import PageWrapper from '../components/PageWrapper';
import Logo from '../components/Logo';

const REDIRECT_SECONDS = 6;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const submit = async () => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('If that email exists, a reset link has been sent.');
      setSent(true);
      setSecondsLeft(REDIRECT_SECONDS);
    } catch (err) {
      toast.error('Something went wrong');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!sent) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          navigate('/login');
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [sent, navigate]);

  return (
    <PageWrapper>
      <div className="max-w-sm mx-auto mt-24 p-6 ce-card">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-4"
        >
          <Logo size={56} showText={false} />
          <h1 className="text-xl font-bold mt-3 ce-heading">Forgot Password</h1>
        </motion.div>

        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <input
                className="ce-input mb-4"
                placeholder="Your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
              />
              <motion.button whileTap={{ scale: 0.97 }} disabled={loading || !email} onClick={submit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-2 rounded-lg disabled:opacity-50 transition-colors">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="text-4xl mb-2">✅</div>
              <p className="text-sm ce-label mb-4">
                If that email exists, a reset link has been sent. Check your inbox (and spam folder).
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
                Redirecting to login in {secondsLeft}s...
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/login')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-2 rounded-lg transition-colors"
              >
                Go to Login Now
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {!sent && (
          <a href="/login" className="block text-center text-sm text-indigo-600 dark:text-indigo-400 mt-4">← Back to login</a>
        )}
      </div>
    </PageWrapper>
  );
}