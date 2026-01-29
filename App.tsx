import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider, useAuth } from './hooks/use-auth';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './lib/protected-route';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { Teachers } from './pages/Teachers';
import { MarksEntry } from './pages/MarksEntry';
import { Reports } from './pages/Reports';
import { Assessments } from './pages/Assessments';
import { Tests } from './pages/Tests';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { P7ExamSets } from './pages/P7ExamSets';
import { AdminDashboard } from './pages/AdminDashboard';
import { Login } from './pages/Login';
import LandingPage from './pages/marketing/LandingPage';
import Finance from './pages/Finance';
import FeeStructures from './pages/FeeStructures';
import Expenses from './pages/Expenses';
import Scholarships from './pages/Scholarships';
import FinancialReports from './pages/FinancialReports';
import { GateAttendance } from './pages/GateAttendance';
import { ClassAttendance } from './pages/ClassAttendance';
import { TeacherAttendance } from './pages/TeacherAttendance';
import { AttendanceSettings } from './pages/AttendanceSettings';
import RecordPayment from './pages/RecordPayment';
import StudentFees from './pages/StudentFees';
import { BoardingDashboard } from './pages/BoardingDashboard';
import { DormitoryManager } from './pages/DormitoryManager';
import { BoardingAttendance } from './pages/BoardingAttendance';
import { LeaveManagement } from './pages/LeaveManagement';
import { VisitorLog } from './pages/VisitorLog';
import { Messages, ConversationView } from './pages/Messages';
import { Supervision } from './pages/Supervision';
import { Planning } from './pages/Planning';

function LandingWrapper() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0052CC]"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <LandingPage />;
}

function LoginWrapper() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0052CC]"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <Login />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<LandingWrapper />} />
              <Route path="/login" element={<LoginWrapper />} />
              <Route
                path="/app/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route index element={<Dashboard />} />
                        <Route path="students" element={<Students />} />
                        <Route path="teachers" element={<Teachers />} />
                        <Route path="marks" element={<MarksEntry />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="assessments" element={<Assessments />} />
                        <Route path="tests" element={<Tests />} />
                        <Route path="p7" element={<P7ExamSets />} />
                        <Route path="analytics" element={<Analytics />} />

                        <Route path="finance" element={<Finance />} />
                        <Route path="finance/record-payment" element={<RecordPayment />} />
                        <Route path="finance/student-fees" element={<StudentFees />} />
                        <Route path="fee-structures" element={<FeeStructures />} />
                        <Route path="expenses" element={<Expenses />} />
                        <Route path="scholarships" element={<Scholarships />} />
                        <Route path="financial-reports" element={<FinancialReports />} />
                        <Route path="gate-attendance" element={<GateAttendance />} />
                        <Route path="class-attendance" element={<ClassAttendance />} />
                        <Route path="teacher-attendance" element={<TeacherAttendance />} />
                        <Route path="attendance-settings" element={<AttendanceSettings />} />
                        <Route path="boarding" element={<BoardingDashboard />} />
                        <Route path="dormitory-manager" element={<DormitoryManager />} />
                        <Route path="boarding-attendance" element={<BoardingAttendance />} />
                        <Route path="leave-management" element={<LeaveManagement />} />
                        <Route path="visitor-log" element={<VisitorLog />} />
                        <Route path="messages" element={<Messages />} />
                        <Route path="messages/:id" element={<ConversationView />} />
                        <Route path="supervision" element={<Supervision />} />
                        <Route path="planning" element={<Planning />} />
                        <Route path="admin" element={<AdminDashboard />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="*" element={<Navigate to="/app" replace />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
