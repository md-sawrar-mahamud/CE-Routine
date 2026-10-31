import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import CivilBackground from './components/CivilBackground';
import { ThemeProvider } from './context/ThemeContext';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const UploadTeachers = lazy(() => import('./pages/UploadTeachers'));
const UploadStudents = lazy(() => import('./pages/UploadStudents'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const AdminRoutine = lazy(() => import('./pages/AdminRoutine'));
const Profile = lazy(() => import('./pages/Profile'));
const ManageStaff = lazy(() => import('./pages/ManageStaff'));
const WeekRoutine = lazy(() => import('./pages/WeekRoutine'));

function Loader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        {/* Animated civil-engineering background — mounted once, theme-aware, persists across routes */}
        <CivilBackground />

        <div className="ce-app-content">
          <Navbar />
          <Toaster position="top-right" />
          <Suspense fallback={<Loader />}>

<Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/change-password" element={<ChangePassword />} />

          <Route path="/admin/routine" element={
            <ProtectedRoute allowedRoles={['admin', 'moderator']}><AdminRoutine /></ProtectedRoute>
          } />
          <Route path="/admin/upload-teachers" element={
            <ProtectedRoute allowedRoles={['admin', 'moderator']}><UploadTeachers /></ProtectedRoute>
          } />
          <Route path="/admin/upload-students" element={
            <ProtectedRoute allowedRoles={['admin', 'moderator']}><UploadStudents /></ProtectedRoute>
          } />
<Route path="/admin/staff" element={
  <ProtectedRoute allowedRoles={['admin']}><ManageStaff /></ProtectedRoute>
} />
          <Route path="/teacher/dashboard" element={
            <ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>
          } />
          <Route path="/student/dashboard" element={
            <ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>
          } />
          <Route path="/week-routine" element={
            <ProtectedRoute allowedRoles={['admin', 'moderator', 'teacher', 'student']}><WeekRoutine /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={['admin', 'moderator', 'teacher', 'student']}><Profile /></ProtectedRoute>
          } />
        </Routes>
          </Suspense>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}