import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Stats from './pages/stats/Stats'
import Intake from './pages/intake/Intake'
import Consult from './pages/consult/Consult'
import FounderDB from './pages/founderdb/FounderDB'
import Experts from './pages/experts/Experts'
import Mentoring from './pages/mentoring/Mentoring'
import Support from './pages/support/Support'
import Selected from './pages/selected/Selected'
import Startup from './pages/startup/Startup'
import Growth from './pages/growth/Growth'
import Report from './pages/report/Report'
import Settings from './pages/settings/Settings'
import Apply from './pages/apply/Apply'
import ExpertApply from './pages/expert-apply/ExpertApply'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400">로딩 중...</div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user, profile, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400">로딩 중...</div>
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={(user && profile) ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/apply" element={<Apply />} />
      <Route path="/expert-apply" element={<ExpertApply />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="stats" element={<Stats />} />
        <Route path="intake" element={<Intake />} />
        <Route path="consult" element={<Consult />} />
        <Route path="founderdb" element={<FounderDB />} />
        <Route path="experts" element={<Experts />} />
        <Route path="mentoring" element={<Mentoring />} />
        <Route path="support" element={<Support />} />
        <Route path="selected" element={<Selected />} />
        <Route path="startup" element={<Startup />} />
        <Route path="growth" element={<Growth />} />
        <Route path="report" element={<Report />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
