import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persister } from './lib/queryClient';
import { OfflineIndicator } from './components/OfflineIndicator';
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
import { Login } from './pages/Login';
import { AdminLayout } from './pages/admin/AdminLayout';
import { Overview } from './pages/admin/Overview';
import { SchoolList } from './pages/admin/schools/SchoolList';
import { SchoolDetails } from './pages/admin/schools/SchoolDetails';
import { UserList } from './pages/admin/users/UserList';
import { AuditLogs } from './pages/admin/AuditLogs';
import { Settings as AdminSettings } from './pages/admin/Settings';
import { ParentManagement } from './pages/admin/ParentManagement';
import { VerifyStudent } from './pages/VerifyStudent';
import LandingPage from './pages/marketing/LandingPage';
import { GateAttendance } from './pages/GateAttendance';
import { ClassAttendance } from './pages/ClassAttendance';
import { TeacherAttendance } from './pages/TeacherAttendance';
import { AttendanceSettings } from './pages/AttendanceSettings';
import { BoardingDashboard } from './pages/BoardingDashboard';
import { DormitoryManager } from './pages/DormitoryManager';
import { BoardingAttendance } from './pages/BoardingAttendance';
import { LeaveManagement } from './pages/LeaveManagement';
import { VisitorLog } from './pages/VisitorLog';
import { Messages, ConversationView } from './pages/Messages';
import { Supervision } from './pages/Supervision';
import { Planning } from './pages/Planning';
import { ClassManagement } from './pages/ClassManagement';
import FinancialHub from './pages/FinancialHub';
import ParentLayout from './pages/parent/ParentLayout';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentStudentView from './pages/parent/ParentStudentView';
import ParentAttendance from './pages/parent/ParentAttendance';
import ParentFees from './pages/parent/ParentFees';
import ParentMessages from './pages/parent/ParentMessages';
import ParentNotifications from './pages/parent/ParentNotifications';
import ParentProfile from './pages/parent/ParentProfile';
import ParentSchoolInfo from './pages/parent/ParentSchoolInfo';

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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }}
    >
      <ThemeProvider>
        <AuthProvider>
          <HashRouter>
            <OfflineIndicator />
            <Routes>
              <Route path="/" element={<LandingWrapper />} />
              <Route path="/login" element={<LoginWrapper />} />
              <Route path="/verify-student/:id" element={<VerifyStudent />} />

              <Route
                path="/app/admin/*"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Overview />} />
                <Route path="schools" element={<SchoolList />} />
                <Route path="schools/:id" element={<SchoolDetails />} />
                <Route path="users" element={<UserList />} />
                <Route path="audit" element={<AuditLogs />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              <Route
                path="/app/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route index element={<Dashboard />} />
                        <Route path="classes" element={<ClassManagement />} />
                        <Route path="students" element={<Students />} />
                        <Route path="teachers" element={<Teachers />} />
                        <Route path="marks" element={<MarksEntry />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="assessments" element={<Assessments />} />
                        <Route path="tests" element={<Tests />} />
                        <Route path="p7" element={<P7ExamSets />} />
                        <Route path="analytics" element={<Analytics />} />


                        <Route path="finance-hub" element={<FinancialHub />} />
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
                        <Route path="parents" element={<ParentManagement />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="*" element={<Navigate to="/app" replace />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />


              {/* Parent Portal Routes */}
              <Route
                path="/parent/*"
                element={
                  <ProtectedRoute>
                    <ParentLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<ParentDashboard />} />
                <Route path="student/:id" element={<ParentStudentView />} />
                <Route path="attendance" element={<ParentAttendance />} />
                <Route path="fees" element={<ParentFees />} />
                <Route path="messages" element={<ParentMessages />} />
                <Route path="messages/:id" element={<ParentMessages />} /> {/* For specific conversation */}
                <Route path="notifications" element={<ParentNotifications />} />
                <Route path="profile" element={<ParentProfile />} />
                <Route path="school-info" element={<ParentSchoolInfo />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </AuthProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
