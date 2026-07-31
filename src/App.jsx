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
import ConsultApply from './pages/consult/ConsultApply'
import ExpertApply from './pages/expert-apply/ExpertApply'
import MentorBusinessApply from './pages/mentor-match/BusinessApply'
import MentorCompanySelect from './pages/mentor-match/CompanySelect'
import MentorMatchAdmin from './pages/mentor-match/MentorMatchAdmin'
import Founders from './pages/founders/Founders'
import Education from './pages/education/Education'
import EducationDashboard from './pages/education/EducationDashboard'
import EducationApply from './pages/education/EducationApply'
import Certificate from './pages/education/Certificate'
import StudentPortal from './pages/education/StudentPortal'
import Budget from './pages/budget/Budget'
import BudgetDashboard from './pages/budget/BudgetDashboard'
import BudgetReport from './pages/budget/BudgetReport'
import MentoringLogin from './pages/mentor-portal/MentoringLogin'
import MentoringDashboard from './pages/mentor-portal/MentoringDashboard'
import MentoringPlan from './pages/mentor-portal/MentoringPlan'
import MentoringLog from './pages/mentor-portal/MentoringLog'
import MentoringReport from './pages/mentor-portal/MentoringReport'
import MentoringAdmin from './pages/mentor-portal/MentoringAdmin'
import DocumentManagementPage from './pages/documents/DocumentManagementPage'

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
  const hostname = window.location.hostname
  const isStudyDomain   = hostname === 'study.ubpi.or.kr'
  const isConsultDomain = hostname === 'consult.ubpi.or.kr'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400">로딩 중...</div>
    </div>
  )

  // study.ubpi.or.kr: 교육신청 전용 도메인
  if (isStudyDomain) {
    return (
      <Routes>
        <Route path="/education-apply" element={<EducationApply />} />
        <Route path="/certificate/:id" element={<Certificate />} />
        <Route path="/student-portal" element={<StudentPortal />} />
        <Route path="*" element={<Navigate to="/education-apply" replace />} />
      </Routes>
    )
  }

  // consult.ubpi.or.kr: 상담 신청 전용 도메인
  if (isConsultDomain) {
    return (
      <Routes>
        <Route path="/consult" element={<ConsultApply />} />
        <Route path="*" element={<Navigate to="/consult" replace />} />
      </Routes>
    )
  }

  // manage.ubpi.or.kr 및 기타 도메인: 관리자 라우팅
  return (
    <Routes>
      {/* 멘토 포털 (공개) */}
      <Route path="/mentoring" element={<MentoringLogin />} />
      <Route path="/mentoring/dashboard" element={<MentoringDashboard />} />
      <Route path="/mentoring/plan" element={<MentoringPlan />} />
      <Route path="/mentoring/log" element={<MentoringLog />} />
      <Route path="/mentoring/report" element={<MentoringReport />} />

      <Route path="/login" element={(user && profile) ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/apply" element={<Apply />} />
      <Route path="/consult" element={<ConsultApply />} />
      <Route path="/expert-apply" element={<ExpertApply />} />
      <Route path="/mentor-apply" element={<MentorBusinessApply />} />
      <Route path="/mentor-select" element={<MentorCompanySelect />} />
      <Route path="/education-apply" element={<EducationApply />} />
      <Route path="/certificate/:id" element={<Certificate />} />
      <Route path="/student-portal" element={<StudentPortal />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="stats" element={<Stats />} />
        <Route path="intake" element={<Intake />} />
        <Route path="founders" element={<Founders />} />
        <Route path="consult" element={<Consult />} />
        <Route path="founderdb" element={<FounderDB />} />
        <Route path="experts" element={<Experts />} />
        <Route path="mentoring-manage" element={<Mentoring />} />
        <Route path="mentoring/admin" element={<MentoringAdmin />} />
        <Route path="mentor-match/admin" element={<MentorMatchAdmin />} />
        <Route path="support" element={<Support />} />
        <Route path="selected" element={<Selected />} />
        <Route path="startup" element={<Startup />} />
        <Route path="growth" element={<Growth />} />
        <Route path="report" element={<Report />} />
        <Route path="settings" element={<Settings />} />
        <Route path="documents" element={<DocumentManagementPage />} />
        <Route path="education" element={<Education />} />
        <Route path="education/dashboard" element={<EducationDashboard />} />
        <Route path="budget" element={<Budget />} />
        <Route path="budget/dashboard" element={<BudgetDashboard />} />
        <Route path="budget/report" element={<BudgetReport />} />
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
