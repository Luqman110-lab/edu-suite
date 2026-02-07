import React, { useState, useEffect, useMemo, useRef } from 'react';
import { dbService } from '../services/api';
import Papa from 'papaparse';
import { useQueryClient } from '@tanstack/react-query';
import { Teacher, ClassLevel, Gender, ALL_SUBJECTS, SchoolSettings, Student } from '../types';
import { Button } from '../components/Button';
import { useTheme } from '../contexts/ThemeContext';
import { TeacherFormWizard } from '../components/TeacherFormWizard';
import { TeacherAttendanceSummaryCard, TeacherPerformanceMetricsCard, TeacherQuickStatsCard } from '../components/TeacherProfileCards';
const FaceEnrollment = React.lazy(() => import('../client/src/components/FaceEnrollment'));

const ROLES = ['Class Teacher', 'Subject Teacher', 'Headteacher', 'DOS'];

const Icons = {
  Search: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
  ),
  Filter: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
  ),
  Download: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
  ),
  Upload: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
  ),
  Users: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  Check: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12" /></svg>
  ),
  X: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
  ),
  Trash: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
  ),
  Edit: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
  ),
  Eye: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  GraduationCap: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" /></svg>
  ),
  Calendar: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
  ),
  ArrowLeft: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
  ),
  FileText: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6" /></svg>
  ),
  Award: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></svg>
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
  ),
};

const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info' | 'warning'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';

  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-slide-up`}>
      {type === 'success' && <Icons.Check className="w-5 h-5" />}
      {type === 'error' && <Icons.X className="w-5 h-5" />}
      {type === 'warning' && <Icons.AlertTriangle className="w-5 h-5" />}
      {type === 'info' && <Icons.FileText className="w-5 h-5" />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <Icons.X className="w-4 h-4" />
      </button>
    </div>
  );
};

const TeacherProfile = ({ teacher, students, onEdit, onDelete, onBack, onEnrollFace, hasFaceEnrolled, isDark }: { teacher: Teacher; students: Student[]; onEdit: () => void; onDelete: () => void; onBack: () => void; onEnrollFace: () => void; hasFaceEnrolled: boolean; isDark: boolean }) => {
  const roles = teacher.roles || [];
  const teachingClasses = (teacher.teachingClasses || []).map(tc => String(tc));
  const subjects = teacher.subjects || [];

  const studentsForTeacher = useMemo(() => {
    if (roles.includes('Class Teacher') && teacher.assignedClass && teacher.assignedStream) {
      return students.filter(s => s.classLevel === teacher.assignedClass && s.stream === teacher.assignedStream);
    }
    if (roles.includes('Subject Teacher') && teachingClasses.length > 0) {
      return students.filter(s => {
        // Check if any teaching assignment matches student's class-stream combo
        return teachingClasses.some(tc => {
          if (tc.includes('-')) {
            const [cls, stream] = tc.split('-');
            return s.classLevel === cls && s.stream === stream;
          }
          // Legacy: just class level match
          return s.classLevel === tc;
        });
      });
    }
    return [];
  }, [teacher, students, roles, teachingClasses]);

  const initials = teacher.initials || (teacher.name || '').split(' ').map(n => n?.[0] || '').join('').substring(0, 2);

  // Calculate years of service
  const yearsOfService = useMemo(() => {
    if (!teacher.dateJoined) return 0;
    const joined = new Date(teacher.dateJoined);
    const now = new Date();
    return Math.floor((now.getTime() - joined.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }, [teacher.dateJoined]);

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className={`flex items-center gap-2 mb-4 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'} transition-colors`}
      >
        <Icons.ArrowLeft className="w-5 h-5" />
        <span>Back to Staff Directory</span>
      </button>

      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border mb-6 overflow-hidden`}>
        <div className="h-28 bg-gradient-to-r from-[#7B1113] to-[#1E3A5F]"></div>
        <div className="px-6 pb-6">
          <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-end -mt-14 mb-4 gap-4">
            <div className="flex items-end">
              <div className={`h-28 w-28 rounded-full ${isDark ? 'bg-gray-800' : 'bg-white'} p-1 shadow-lg overflow-hidden`}>
                {teacher.photoBase64 ? (
                  <img src={teacher.photoBase64} alt={teacher.name} className={`h-full w-full rounded-full object-cover border-4 ${isDark ? 'border-gray-700' : 'border-white'}`} />
                ) : (
                  <div className={`h-full w-full rounded-full bg-gradient-to-br from-[#7B1113] to-[#1E3A5F] flex items-center justify-center text-2xl font-bold text-white border-4 ${isDark ? 'border-gray-700' : 'border-white'}`}>
                    {initials}
                  </div>
                )}
              </div>
              <div className="ml-4 mb-2">
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.name}</h2>
                {teacher.employeeId && (
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ID: {teacher.employeeId}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {roles.map(role => (
                    <span key={role} className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#7B1113] to-[#1E3A5F] text-white text-xs font-medium">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={onEdit}>
                <Icons.Edit className="w-4 h-4 mr-1" /> Edit
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex items-center gap-2`}>
            <Icons.Users className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Contact Information</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Phone</label>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.phone || '—'}</p>
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Email</label>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'} break-all`}>{teacher.email || '—'}</p>
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Gender</label>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.gender === 'M' ? 'Male' : 'Female'}</p>
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Status</label>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${teacher.isActive !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {teacher.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex items-center gap-2`}>
            <Icons.GraduationCap className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Professional Details</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Qualifications</label>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.qualifications || '—'}</p>
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Date Joined</label>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.dateJoined || '—'}</p>
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Employee ID</label>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.employeeId || '—'}</p>
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Initials</label>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.initials || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex items-center gap-2`}>
            <Icons.Award className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Academic Assignments</h3>
          </div>
          <div className="p-6 space-y-5">
            {roles.includes('Class Teacher') && (
              <div className={`${isDark ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-100'} p-4 rounded-lg border`}>
                <h4 className={`text-xs font-bold ${isDark ? 'text-blue-300' : 'text-blue-800'} uppercase mb-2`}>Class Teacher</h4>
                <p className={`text-xl font-bold ${isDark ? 'text-blue-200' : 'text-blue-900'}`}>{teacher.assignedClass} {teacher.assignedStream}</p>
                <p className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'} mt-1`}>Responsible for report card signing</p>
              </div>
            )}

            {roles.includes('Subject Teacher') && (
              <div>
                <h4 className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-3`}>Subject Teaching</h4>
                <div className="space-y-3">
                  <div>
                    <label className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Subjects</label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {subjects.map(sub => (
                        <span key={sub} className={`px-2.5 py-1 ${isDark ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-50 text-green-700 border-green-200'} text-xs rounded-lg border uppercase font-semibold`}>
                          {sub}
                        </span>
                      ))}
                      {subjects.length === 0 && <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} italic`}>None assigned</span>}
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Classes & Streams</label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {teachingClasses.map(cls => (
                        <span key={cls} className={`px-2.5 py-1 ${isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-700 border-gray-200'} text-xs rounded-lg border font-medium`}>
                          {cls.includes('-') ? cls.replace('-', ' ') : cls}
                        </span>
                      ))}
                      {teachingClasses.length === 0 && <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} italic`}>None assigned</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!roles.includes('Class Teacher') && !roles.includes('Subject Teacher') && (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} italic`}>Administrative role only</p>
            )}
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Icons.Users className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Workload Summary</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'} border text-center`}>
                <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{studentsForTeacher.length}</div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium mt-1`}>Students</div>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'} border text-center`}>
                <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{teachingClasses.length || (teacher.assignedClass ? 1 : 0)}</div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium mt-1`}>Classes</div>
              </div>
            </div>
            {roles.includes('Class Teacher') && studentsForTeacher.length > 0 && (
              <div>
                <h4 className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-2`}>Student Breakdown</h4>
                <div className="flex gap-4 text-sm">
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                    <span className="font-medium">{studentsForTeacher.filter(s => s.gender === 'M').length}</span> Boys
                  </span>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                    <span className="font-medium">{studentsForTeacher.filter(s => s.gender === 'F').length}</span> Girls
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <TeacherAttendanceSummaryCard teacherId={teacher.id!} isDark={isDark} />
        <TeacherQuickStatsCard
          totalStudents={studentsForTeacher.length}
          totalClasses={teachingClasses.length || (teacher.assignedClass ? 1 : 0)}
          totalSubjects={subjects.length}
          yearsOfService={yearsOfService}
          isDark={isDark}
        />
      </div>

      {roles.includes('Subject Teacher') && teachingClasses.length > 0 && (
        <div className="mb-6">
          <TeacherPerformanceMetricsCard
            teacherId={teacher.id!}
            teachingClasses={teachingClasses}
            subjects={subjects}
            isDark={isDark}
          />
        </div>
      )}

      <div className={`flex justify-end border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} pt-6`}>
        <Button variant="danger" onClick={onDelete}>
          <Icons.Trash className="w-4 h-4 mr-1.5" /> Delete Teacher
        </Button>
      </div>
    </div>
  );
};

export const Teachers: React.FC = () => {
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<'list' | 'profile'>('list');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newTeachingClassSelected, setNewTeachingClassSelected] = useState<string>('');
  const [showFaceEnrollment, setShowFaceEnrollment] = useState(false);
  const [faceEnrollTeacher, setFaceEnrollTeacher] = useState<Teacher | null>(null);
  const [enrolledFaceIds, setEnrolledFaceIds] = useState<Set<number>>(new Set());

  const initialFormState: Partial<Teacher> = {
    employeeId: '',
    name: '',
    gender: Gender.Male,
    phone: '',
    email: '',
    roles: [],
    assignedClass: undefined,
    assignedStream: undefined,
    subjects: [],
    teachingClasses: [],
    qualifications: '',
    dateJoined: '',
    initials: '',
    isActive: true,
  };

  const [formData, setFormData] = useState<Partial<Teacher>>(initialFormState);

  const loadData = async () => {
    const t = await dbService.getTeachers();
    const s = await dbService.getSettings();
    const st = await dbService.getStudents();
    setTeachers(t);
    setSettings(s);
    setStudents(st);

    try {
      const faceResp = await fetch('/api/face-embeddings?personType=teacher');
      if (faceResp.ok) {
        const faceData = await faceResp.json();
        const ids = new Set<number>(faceData.map((f: any) => f.personId));
        setEnrolledFaceIds(ids);
      }
    } catch (err) {
      console.error('Failed to load face embeddings:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToast({ message, type });
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        (t.name || '').toLowerCase().includes(searchLower) ||
        (t.email || '').toLowerCase().includes(searchLower) ||
        (t.phone || '').includes(searchQuery) ||
        (t.employeeId || '').toLowerCase().includes(searchLower);
      const matchesRole = !selectedRole || (t.roles || []).includes(selectedRole);
      const matchesGender = !selectedGender || t.gender === selectedGender;
      const matchesClass = !selectedClass ||
        t.assignedClass === selectedClass ||
        (t.teachingClasses || []).some(tc => {
          if (tc.includes('-')) {
            return tc.startsWith(selectedClass + '-') || tc.split('-')[0] === selectedClass;
          }
          return tc === selectedClass;
        });
      return matchesSearch && matchesRole && matchesGender && matchesClass;
    });
  }, [teachers, searchQuery, selectedRole, selectedGender, selectedClass]);

  const stats = useMemo(() => {
    const total = teachers.length;
    const active = teachers.filter(t => t.isActive !== false).length;
    const male = teachers.filter(t => t.gender === 'M').length;
    const female = teachers.filter(t => t.gender === 'F').length;
    const classTeachers = teachers.filter(t => (t.roles || []).includes('Class Teacher')).length;
    const subjectTeachers = teachers.filter(t => (t.roles || []).includes('Subject Teacher')).length;
    const headteachers = teachers.filter(t => (t.roles || []).includes('Headteacher')).length;
    return { total, active, male, female, classTeachers, subjectTeachers, headteachers };
  }, [teachers]);

  const handleOpenModal = (teacher?: Teacher) => {
    if (teacher) {
      setEditingId(teacher.id!);
      setFormData({ ...teacher });
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setNewTeachingClassSelected('');
    setIsModalOpen(true);
  };

  const handleViewProfile = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setViewMode('profile');
  };

  const handleBackToList = () => {
    setSelectedTeacher(null);
    setViewMode('list');
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this teacher? This cannot be undone.')) {
      try {
        await dbService.deleteTeacher(id);
        await loadData();
        await queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        showToast('Teacher deleted successfully', 'success');
        if (viewMode === 'profile') handleBackToList();
      } catch (error) {
        console.error('Error deleting teacher:', error);
        showToast('Failed to delete teacher. Please try again.', 'error');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Delete ${selectedIds.size} selected teacher(s)? This cannot be undone.`)) {
      try {
        for (const id of selectedIds) {
          await dbService.deleteTeacher(id);
        }
        showToast(`${selectedIds.size} teachers deleted`, 'success');
        setSelectedIds(new Set());
        loadData();
        await queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      } catch (error) {
        console.error('Error deleting teachers:', error);
        showToast('Failed to delete teachers. Please try again.', 'error');
      }
    }
  };

  const toggleArrayItem = (array: any[], item: any) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    } else {
      return [...array, item];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.roles?.length === 0) {
      showToast('Name and at least one role are required.', 'error');
      return;
    }

    const teacherData = formData as Teacher;

    try {
      if (editingId) {
        const updated = await dbService.updateTeacher(teacherData);
        showToast('Teacher updated successfully', 'success');
        if (selectedTeacher && selectedTeacher.id === editingId) {
          setSelectedTeacher(updated);
        }
      } else {
        await dbService.addTeacher(teacherData);
        showToast('Teacher added successfully', 'success');
      }

      setIsModalOpen(false);
      loadData();
      await queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    } catch (error) {
      console.error('Error saving teacher:', error);
      showToast('Failed to save teacher. Please try again.', 'error');
    }
  };

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTeachers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTeachers.map(t => t.id!)));
    }
  };

  const handleExportCSV = () => {
    const headers = ['Employee ID', 'Name', 'Gender', 'Phone', 'Email', 'Roles', 'Assigned Class', 'Assigned Stream', 'Subjects', 'Teaching Classes', 'Qualifications', 'Date Joined', 'Initials', 'Active'];
    const rows = teachers.map(t => [
      t.employeeId || '',
      t.name,
      t.gender,
      t.phone,
      t.email,
      t.roles.join(';'),
      t.assignedClass || '',
      t.assignedStream || '',
      t.subjects.join(';'),
      t.teachingClasses.join(';'),
      t.qualifications || '',
      t.dateJoined || '',
      t.initials || '',
      t.isActive !== false ? 'Yes' : 'No'
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teachers_export.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${teachers.length} teachers`, 'success');
  };

  const handleDownloadTemplate = () => {
    const headers = ['Employee ID', 'Name', 'Gender', 'Phone', 'Email', 'Roles', 'Assigned Class', 'Assigned Stream', 'Subjects', 'Teaching Classes', 'Qualifications', 'Date Joined', 'Initials', 'Active'];
    // Teaching Classes format: CLASS-STREAM combinations separated by semicolons (e.g., P3-DILIGENT;P6-WISDOM)
    const example = ['T001', 'MR. JOHN OKELLO', 'M', '0700123456', 'john@school.com', 'Class Teacher;Subject Teacher', 'P5', 'EAST', 'MATHS;SCIENCE', 'P3-DILIGENT;P6-WISDOM', 'Diploma in Education', '2020-01-15', 'JO', 'Yes'];
    const csv = [headers.join(','), example.map(c => `"${c}"`).join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teachers_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input value to allow selecting same file again
    if (fileInputRef.current) {
      // Don't reset immediately, do it in finally block
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/[\s_-]/g, ''),
      complete: async (results) => {
        const rows = results.data as any[];
        if (rows.length === 0) {
          showToast('CSV file is empty or invalid', 'error');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        let imported = 0;
        let skipped = 0;
        let errorMsg = '';

        try {
          for (const row of rows) {
            // Flexible column matching
            const name = row.name || row.fullname || `${row.firstname || ''} ${row.lastname || ''}`.trim();
            if (!name) {
              skipped++;
              continue;
            }

            // Parse Roles
            const rolesStr = row.roles || row.role || '';
            const roles = rolesStr ? rolesStr.split(/[;,]/).map((r: string) => {
              const trimmed = r.trim();
              // Try to match with known roles (case insensitive)
              const match = ROLES.find(known => known.toLowerCase() === trimmed.toLowerCase());
              return match || trimmed;
            }).filter((r: string) => ROLES.includes(r)) : [];

            if (roles.length === 0) {
              // Default to Subject Teacher if no role specified? Or skip? 
              // Existing logic skips. Let's stick to that for safety.
              skipped++;
              continue;
            }

            // Parse Subjects
            const subjectsStr = row.subjects || row.subject || '';
            const subjects = subjectsStr ? subjectsStr.split(/[;,]/).map((s: string) => s.trim().toUpperCase()).filter((s: string) => ALL_SUBJECTS.includes(s)) : [];

            // Parse Teaching Classes
            const classesStr = row.teachingclasses || row.classes || '';
            const teachingClasses = classesStr ? classesStr.split(/[;,]/).map((c: string) => c.trim().toUpperCase()).filter((c: string) => {
              // Validate class/stream format
              if (c.includes('-')) {
                const [cls] = c.split('-');
                return Object.values(ClassLevel).includes(cls as ClassLevel);
              }
              return Object.values(ClassLevel).includes(c as ClassLevel);
            }) : [];

            const assignedClassRaw = row.assignedclass || row.class || '';
            const assignedClass = Object.values(ClassLevel).includes(assignedClassRaw as ClassLevel) ? assignedClassRaw as ClassLevel : undefined;

            const assignedStream = row.assignedstream || row.stream || undefined;

            const teacher: Teacher = {
              employeeId: row.employeeid || row.id || row.empid || '',
              name: name.toUpperCase(),
              gender: ((row.gender || row.sex || '').toUpperCase().startsWith('F')) ? Gender.Female : Gender.Male,
              phone: row.phone || row.contact || '',
              email: row.email || '',
              roles,
              assignedClass,
              assignedStream,
              subjects,
              teachingClasses,
              qualifications: row.qualifications || '',
              dateJoined: row.datejoined || row.joined || '',
              initials: row.initials || '',
              isActive: (row.active || 'yes').toLowerCase() !== 'no',
            };

            // Check for duplicates (by email or phone if provided)?
            // Existing logic didn't check duplicates client-side, just dbService.addTeacher.
            // We'll rely on dbService.addTeacher to handle or throw errors if unique constraints exist.
            // But we should try catch individually.

            try {
              // Check if teacher exists in current list by Name or ID?
              // Ideally we should check against 'teachers' state.
              const exists = teachers.some(t =>
                (t.employeeId && teacher.employeeId && t.employeeId === teacher.employeeId) ||
                (t.name.toLowerCase() === teacher.name.toLowerCase())
              );

              if (exists) {
                skipped++;
                continue;
              }

              await dbService.addTeacher(teacher);
              imported++;
            } catch (err) {
              skipped++;
            }
          }

          let msg = `Imported ${imported} teachers.`;
          if (skipped > 0) msg += ` ${skipped} skipped (duplicates or invalid data).`;
          showToast(msg, imported > 0 ? 'success' : (skipped > 0 ? 'warning' : 'error'));
          loadData();
          await queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });


        } catch (error: any) {
          console.error("CSV Import Error:", error);
          showToast(`Error processing CSV: ${error.message}`, 'error');
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (error: any) => {
        showToast(`CSV Parsing Error: ${error.message}`, 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const inputClasses = `mt-1 block w-full rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'} px-3 py-2 shadow-sm focus:border-[#7B1113] focus:ring-2 focus:ring-[#7B1113]/30 focus:outline-none sm:text-sm transition-all duration-200`;
  const checkboxClasses = "h-4 w-4 rounded border-gray-300 text-[#7B1113] focus:ring-[#7B1113] cursor-pointer";

  const availableStreams = formData.assignedClass && settings ? (settings.streams[formData.assignedClass] || []) : [];
  const teachingClassStreams = newTeachingClassSelected && settings ? (settings.streams[newTeachingClassSelected] || []) : [];

  if (viewMode === 'profile' && selectedTeacher) {
    return (
      <TeacherProfile
        teacher={selectedTeacher}
        students={students}
        onEdit={() => handleOpenModal(selectedTeacher)}
        onDelete={() => handleDelete(selectedTeacher.id!)}
        onBack={handleBackToList}
        onEnrollFace={() => {
          setFaceEnrollTeacher(selectedTeacher);
          setShowFaceEnrollment(true);
        }}
        hasFaceEnrolled={enrolledFaceIds.has(selectedTeacher.id!)}
        isDark={isDark}
      />
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Staff Directory</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Manage teaching and administrative staff</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Icons.FileText className="w-4 h-4 mr-1.5" /> Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Icons.Upload className="w-4 h-4 mr-1.5" /> Import
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Icons.Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
          <Button onClick={() => handleOpenModal()}>Add Teacher</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border shadow-sm`}>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</div>
          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium`}>Total Staff</div>
        </div>
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border shadow-sm`}>
          <div className="text-2xl font-bold text-green-500">{stats.active}</div>
          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium`}>Active</div>
        </div>
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border shadow-sm`}>
          <div className="text-2xl font-bold text-blue-500">{stats.male}</div>
          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium`}>Male</div>
        </div>
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border shadow-sm`}>
          <div className="text-2xl font-bold text-pink-500">{stats.female}</div>
          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium`}>Female</div>
        </div>
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border shadow-sm`}>
          <div className="text-2xl font-bold text-purple-500">{stats.classTeachers}</div>
          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium`}>Class Teachers</div>
        </div>
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border shadow-sm`}>
          <div className="text-2xl font-bold text-orange-500">{stats.subjectTeachers}</div>
          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium`}>Subject Teachers</div>
        </div>
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border shadow-sm`}>
          <div className="text-2xl font-bold text-[#7B1113]">{stats.headteachers}</div>
          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-medium`}>Headteachers</div>
        </div>
      </div>

      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 border shadow-sm`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">

            {showFaceEnrollment && faceEnrollTeacher && (
              <React.Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white dark:bg-gray-800 rounded-xl p-8"><div className="animate-spin w-8 h-8 border-4 border-[#800020] border-t-transparent rounded-full"></div></div></div>}>
                <FaceEnrollment
                  personId={faceEnrollTeacher.id!}
                  personType="teacher"
                  personName={faceEnrollTeacher.name}
                  onSuccess={() => {
                    setShowFaceEnrollment(false);
                    setFaceEnrollTeacher(null);
                    setEnrolledFaceIds(prev => new Set([...prev, faceEnrollTeacher.id!]));
                    showToast('Face enrolled successfully!', 'success');
                  }}
                  onCancel={() => {
                    setShowFaceEnrollment(false);
                    setFaceEnrollTeacher(null);
                  }}
                />
              </React.Suspense>
            )}
            <Icons.Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search by name, email, phone, or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`${inputClasses} pl-9`}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${showFilters ? 'bg-[#7B1113] text-white border-[#7B1113]' : isDark ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
          >
            <Icons.Filter className="w-4 h-4" />
            <span>Filters</span>
            {(selectedRole || selectedGender || selectedClass) && (
              <span className="bg-white text-[#7B1113] text-xs px-1.5 py-0.5 rounded-full font-medium">
                {[selectedRole, selectedGender, selectedClass].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className={inputClasses}
            >
              <option value="">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              value={selectedGender}
              onChange={e => setSelectedGender(e.target.value)}
              className={inputClasses}
            >
              <option value="">All Genders</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className={inputClasses}
            >
              <option value="">All Classes</option>
              {Object.values(ClassLevel).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className={`${isDark ? 'bg-[#7B1113]/20 border-[#7B1113]/50' : 'bg-[#7B1113]/10 border-[#7B1113]/30'} border rounded-lg p-3 flex items-center justify-between`}>
          <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>
            <span className="font-semibold">{selectedIds.size}</span> teacher(s) selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            <Button variant="danger" size="sm" onClick={handleBulkDelete}>
              <Icons.Trash className="w-4 h-4 mr-1" /> Delete Selected
            </Button>
          </div>
        </div>
      )}

      <div className="hidden md:block">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow rounded-lg overflow-hidden border`}>
          <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={isDark ? 'bg-gray-750' : 'bg-gray-50'}>
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filteredTeachers.length > 0 && selectedIds.size === filteredTeachers.length}
                    onChange={toggleSelectAll}
                    className={checkboxClasses}
                  />
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Teacher</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Contact</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Roles</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Assignments</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Status</th>
                <th className={`px-4 py-3 text-right text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`${isDark ? 'bg-gray-800' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredTeachers.map((teacher) => (
                <tr
                  key={teacher.id}
                  className={`${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors cursor-pointer ${selectedIds.has(teacher.id!) ? isDark ? 'bg-[#7B1113]/20' : 'bg-[#7B1113]/10' : ''}`}
                  onClick={() => handleViewProfile(teacher)}
                >
                  <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(teacher.id!)}
                      onChange={() => toggleSelection(teacher.id!)}
                      className={checkboxClasses}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full bg-gradient-to-br from-[#7B1113] to-[#1E3A5F] flex items-center justify-center text-white text-sm font-bold`}>
                        {teacher.initials || teacher.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.name}</div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {teacher.employeeId || teacher.gender === 'M' ? 'Male' : 'Female'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.phone}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{teacher.email}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {teacher.roles.map(role => (
                        <span key={role} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-[#7B1113] to-[#1E3A5F] text-white">
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {teacher.roles.includes('Class Teacher') && teacher.assignedClass && (
                        <div className="mb-1">
                          <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Class:</span> {teacher.assignedClass} {teacher.assignedStream}
                        </div>
                      )}
                      {teacher.roles.includes('Subject Teacher') && teacher.teachingClasses && teacher.teachingClasses.length > 0 && (
                        <div className="mb-1">
                          <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Teaching:</span> {teacher.teachingClasses.slice(0, 2).map(tc => tc.includes('-') ? tc.replace('-', ' ') : tc).join(', ')}{teacher.teachingClasses.length > 2 ? ` +${teacher.teachingClasses.length - 2}` : ''}
                        </div>
                      )}
                      {teacher.roles.includes('Subject Teacher') && teacher.subjects.length > 0 && (
                        <div>
                          <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Subjects:</span> {teacher.subjects.slice(0, 3).join(', ')}{teacher.subjects.length > 3 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${teacher.isActive !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {teacher.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleViewProfile(teacher)}
                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-600 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'} transition-colors`}
                        title="View Profile"
                      >
                        <Icons.Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenModal(teacher)}
                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-600 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'} transition-colors`}
                        title="Edit"
                      >
                        <Icons.Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(teacher.id!)}
                        className={`p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors`}
                        title="Delete"
                      >
                        <Icons.Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={7} className={`px-6 py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Icons.Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No teachers found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {filteredTeachers.map((teacher) => (
          <div
            key={teacher.id}
            className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm ${selectedIds.has(teacher.id!) ? 'ring-2 ring-[#7B1113]' : ''}`}
            onClick={() => handleViewProfile(teacher)}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedIds.has(teacher.id!)}
                onChange={() => toggleSelection(teacher.id!)}
                onClick={e => e.stopPropagation()}
                className={`${checkboxClasses} mt-1`}
              />
              <div className={`h-12 w-12 rounded-full bg-gradient-to-br from-[#7B1113] to-[#1E3A5F] flex items-center justify-center text-white font-bold`}>
                {teacher.initials || teacher.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>{teacher.name}</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${teacher.isActive !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {teacher.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{teacher.phone}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {teacher.roles.map(role => (
                    <span key={role} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-[#7B1113] to-[#1E3A5F] text-white">
                      {role}
                    </span>
                  ))}
                </div>
                {teacher.roles.includes('Class Teacher') && teacher.assignedClass && (
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
                    Class: {teacher.assignedClass} {teacher.assignedStream}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => handleOpenModal(teacher)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
              >
                <Icons.Edit className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => handleDelete(teacher.id!)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
              >
                <Icons.Trash className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        ))}
        {filteredTeachers.length === 0 && (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-8 text-center`}>
            <Icons.Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>No teachers found</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <TeacherFormWizard
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={async (teacher) => {
            try {
              if (editingId) {
                const updated = await dbService.updateTeacher(teacher);
                showToast('Teacher updated successfully', 'success');
                if (selectedTeacher && selectedTeacher.id === editingId) {
                  setSelectedTeacher(updated);
                }
              } else {
                await dbService.addTeacher(teacher);
                showToast('Teacher added successfully', 'success');
              }
              loadData();
            } catch (error) {
              console.error('Error saving teacher:', error);
              showToast('Failed to save teacher. Please try again.', 'error');
              throw error;
            }
          }}
          initialData={formData}
          isEdit={!!editingId}
          settings={settings}
          isDark={isDark}
        />
      )}
    </div>
  );
};
