import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api';
import PageWrapper from '../components/PageWrapper';

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

export default function Profile() {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const loadProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      setFullName(res.data.fullName || '');
      setPhone(res.data.phone || '');
      setNewEmail(res.data.email || '');
    } catch (err) {
      toast.error('Failed to load profile');
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.put('/auth/update-profile', { fullName, phone });
      toast.success('Profile updated');
      loadProfile();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    }
    setSavingProfile(false);
  };

  const saveEmail = async () => {
    setSavingEmail(true);
    try {
      const res = await api.put('/auth/update-email', { newEmail, password: emailPassword });
      toast.success('Email updated');
      localStorage.setItem('token', res.data.token);
      setEmailPassword('');
      loadProfile();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update email');
    }
    setSavingEmail(false);
  };

  const savePassword = async () => {
    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      toast.success('Password changed');
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    }
    setSavingPassword(false);
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async () => {
    if (!photoFile) return toast.error('Choose an image first');
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('photo', photoFile);
    try {
      await api.post('/auth/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Photo updated');
      setPhotoFile(null);
      setPhotoPreview(null);
      loadProfile();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload photo');
    }
    setUploadingPhoto(false);
  };

  if (!user) return null;

  const currentPhotoUrl = user.photoUrl ? `${API_ORIGIN}${user.photoUrl}` : null;

  return (
    <PageWrapper>
      <div className="max-w-xl mx-auto mt-10 px-4 pb-20 space-y-6">
        <h1 className="text-2xl font-bold ce-heading">👤 My Profile</h1>

        {/* Profile Photo */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="ce-card p-5">
          <h2 className="font-semibold mb-3 ce-heading">Profile Photo</h2>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center border dark:border-slate-600">
              {photoPreview ? (
                <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
              ) : currentPhotoUrl ? (
                <img src={currentPhotoUrl} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl text-gray-400 dark:text-slate-400">
                  {user.fullName?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            <div className="flex-1">
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handlePhotoSelect}
                className="text-sm mb-2 block w-full ce-label" />
              <motion.button whileTap={{ scale: 0.97 }} disabled={uploadingPhoto || !photoFile}
                onClick={uploadPhoto}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-sm disabled:opacity-50 transition-colors">
                {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Basic Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}
          className="ce-card p-5">
          <h2 className="font-semibold mb-3 ce-heading">Basic Info</h2>
          <p className="text-xs ce-label mb-3">
            Role: <span className="font-medium capitalize">{user.role}</span>
            {user.regNo && <> · Reg No: <span className="font-medium">{user.regNo}</span></>}
            {user.batch && <> · Batch: <span className="font-medium">{user.batch}</span></>}
          </p>
          <input placeholder="Full Name" className="ce-input mb-2"
            value={fullName} onChange={e => setFullName(e.target.value)} />
          <input placeholder="Phone" className="ce-input mb-3"
            value={phone} onChange={e => setPhone(e.target.value)} />
          <motion.button whileTap={{ scale: 0.97 }} disabled={savingProfile} onClick={saveProfile}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50 transition-colors">
            {savingProfile ? 'Saving...' : 'Save Info'}
          </motion.button>
        </motion.div>

        {/* Change Email */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className="ce-card p-5">
          <h2 className="font-semibold mb-3 ce-heading">Change Email</h2>
          <input placeholder="New Email" type="email" className="ce-input mb-2"
            value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          <input placeholder="Current Password" type="password" className="ce-input mb-3"
            value={emailPassword} onChange={e => setEmailPassword(e.target.value)} />
          <motion.button whileTap={{ scale: 0.97 }} disabled={savingEmail} onClick={saveEmail}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50 transition-colors">
            {savingEmail ? 'Saving...' : 'Update Email'}
          </motion.button>
        </motion.div>

        {/* Change Password */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="ce-card p-5">
          <h2 className="font-semibold mb-3 ce-heading">Change Password</h2>
          <input placeholder="Current Password" type="password" className="ce-input mb-2"
            value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
          <input placeholder="New Password" type="password" className="ce-input mb-3"
            value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <motion.button whileTap={{ scale: 0.97 }} disabled={savingPassword} onClick={savePassword}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50 transition-colors">
            {savingPassword ? 'Saving...' : 'Change Password'}
          </motion.button>
        </motion.div>
      </div>
    </PageWrapper>
  );
}