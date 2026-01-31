
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { useQueryClient } from '@tanstack/react-query';

import { dbService } from '../services/api';
import { Student, ClassLevel, Gender, MarkRecord, SchoolSettings } from '../types';
import { Button } from '../components/Button';
import { useTheme } from '../contexts/ThemeContext';
import { StudentIDCard, BulkIDCardPrint } from '../components/StudentIDCard';
import { StudentFormWizard } from '../components/StudentFormWizard';
import { AttendanceSummaryCard, PerformanceTrendCard, BirthdayBadge } from '../components/StudentProfileCards';
const FaceEnrollment = React.lazy(() => import('../client/src/components/FaceEnrollment'));

const ITEMS_PER_PAGE = 100;

// Modern Imports
import { LayoutGrid, List as ListIcon, Search, Filter, Download, Upload, Plus, Printer, Trash2, MoreHorizontal, Calendar, MapPin, Hash, Building, User, Phone, Mail, Heart, AlertCircle, FileText, School, Clock } from 'lucide-react';

const ProfileHeader = ({ student, onEdit, onBack, onPrintID, onEnrollFace, hasFaceEnrolled, isDark }: { student: Student; onEdit: () => void; onBack: () => void; onPrintID: () => void; onEnrollFace: () => void; hasFaceEnrolled: boolean; isDark: boolean }) => (
  <div className={`rounded-lg shadow-sm border overflow-hidden mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
    <div className="h-32 bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 relative">
      <div className="absolute inset-0 bg-black/10"></div>
    </div>
    <div className="px-6 pb-6">
      <div className="relative flex flex-wrap justify-between items-end -mt-16 mb-4 gap-4">
        <div className="flex items-end">
          <div className={`h-28 w-28 rounded-xl p-1 shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            {student.photoBase64 ? (
              <img src={student.photoBase64} alt={student.name} className="h-full w-full rounded-lg object-cover" />
            ) : (
              <div className={`h-full w-full rounded-lg flex items-center justify-center text-3xl font-bold border-2 ${isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500 border-white'}`}>
                {student.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="ml-4 mb-1">
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.name}</h2>
            <div className={`text-sm flex flex-wrap items-center gap-2 mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <span className="font-mono">{student.indexNumber}</span>
              <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>•</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                {student.classLevel} {student.stream}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${student.gender === 'M' ? (isDark ? 'bg-sky-900 text-sky-300' : 'bg-sky-100 text-sky-800') : (isDark ? 'bg-pink-900 text-pink-300' : 'bg-pink-100 text-pink-800')}`}>
                {student.gender === 'M' ? 'Male' : 'Female'}
              </span>
              {student.boardingStatus && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${student.boardingStatus === 'boarding' ? (isDark ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-800') : (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')}`}>
                  {student.boardingStatus === 'boarding' ? 'Boarder' : 'Day Scholar'}
                </span>
              )}
              <BirthdayBadge dateOfBirth={student.dateOfBirth} isDark={isDark} />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mb-1 flex-wrap">
          <Button variant="outline" size="sm" onClick={onBack}>Back to List</Button>
          <Button variant="outline" size="sm" onClick={onPrintID}>Print ID Card</Button>
          <Button variant={hasFaceEnrolled ? "outline" : "secondary"} size="sm" onClick={onEnrollFace}>
            {hasFaceEnrolled ? 'Update Face' : 'Enroll Face'}
          </Button>
          <Button size="sm" onClick={onEdit}>Edit Profile</Button>
        </div>
      </div>
    </div>
  </div>
);

const AcademicHistory = ({ studentId, isDark }: { studentId: number; isDark: boolean }) => {
  const [history, setHistory] = useState<MarkRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const allMarks = await dbService.getMarks();
      const studentMarks = allMarks.filter(m => m.studentId === studentId).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        if (a.term !== b.term) return b.term - a.term;
        return 0;
      });
      setHistory(studentMarks as any);
      setLoading(false);
    };
    fetchHistory();
  }, [studentId]);

  if (loading) return <div className={`p-4 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading history...</div>;

  return (
    <div className={`rounded-lg shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Academic History</h3>
        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{history.length} Records found</span>
      </div>
      {history.length === 0 ? (
        <div className={`p-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No academic records found for this student.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={isDark ? 'bg-gray-750' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Year</th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Term</th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Type</th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Agg</th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Div</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {history.map((record) => (
                <tr key={record.id} className={isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{record.year}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Term {record.term}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${record.type === 'EOT' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'}`}>
                      {record.type}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-center ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{record.aggregate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-center text-primary-600">{record.division}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const PersonalInfoCard = ({ student, isDark }: { student: Student; isDark: boolean }) => (
  <div className={`rounded-xl shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
    <div className={`px-6 py-4 border-b flex items-center gap-3 ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50/50 border-gray-100'}`}>
      <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-500 shadow-sm border border-gray-100'}`}>
        <User size={18} />
      </div>
      <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>Personal Details</h3>
    </div>
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <div className="group">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Date of Birth</label>
          </div>
          <p className={`text-sm font-medium pl-6 ${isDark ? 'text-gray-200' : 'text-gray-900 group-hover:text-primary-600 transition-colors'}`}>{student.dateOfBirth || '-'}</p>
        </div>
        <div className="group">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Nationality</label>
          </div>
          <p className={`text-sm font-medium pl-6 ${isDark ? 'text-gray-200' : 'text-gray-900 group-hover:text-primary-600 transition-colors'}`}>{student.nationality || 'Ugandan'}</p>
        </div>
        <div className="group">
          <div className="flex items-center gap-2 mb-1">
            <Hash size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Religion</label>
          </div>
          <p className={`text-sm font-medium pl-6 ${isDark ? 'text-gray-200' : 'text-gray-900 group-hover:text-primary-600 transition-colors'}`}>{student.religion || '-'}</p>
        </div>
        <div className="group">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Pay Code</label>
          </div>
          <p className={`text-sm font-mono font-medium pl-6 ${isDark ? 'text-gray-200' : 'text-gray-900 group-hover:text-primary-600 transition-colors'}`}>{student.paycode || '-'}</p>
        </div>
        <div className="group">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Admission Date</label>
          </div>
          <p className={`text-sm font-medium pl-6 ${isDark ? 'text-gray-200' : 'text-gray-900 group-hover:text-primary-600 transition-colors'}`}>{student.admissionDate || '-'}</p>
        </div>
        <div className="group">
          <div className="flex items-center gap-2 mb-1">
            <School size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Previous School</label>
          </div>
          <p className={`text-sm font-medium pl-6 ${isDark ? 'text-gray-200' : 'text-gray-900 group-hover:text-primary-600 transition-colors'}`}>{student.previousSchool || '-'}</p>
        </div>
      </div>

      <div className={`pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
        <label className={`text-xs font-semibold uppercase mb-3 block ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Status Flags</label>
        <div className="flex flex-wrap gap-2">
          {(!student.specialCases.fees && !student.specialCases.sickness && !student.specialCases.absenteeism) ? (
            <span className={`text-sm italic flex items-center gap-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              No active flags
            </span>
          ) : (
            <>
              {student.specialCases.sickness && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs rounded-full font-medium border border-red-200 dark:border-red-800">
                  <Heart size={12} className="fill-current" /> Medical Attention
                </span>
              )}
              {student.specialCases.absenteeism && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-xs rounded-full font-medium border border-orange-200 dark:border-orange-800">
                  <AlertCircle size={12} /> Chronic Absenteeism
                </span>
              )}
              {student.specialCases.fees && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs rounded-full font-medium border border-yellow-200 dark:border-yellow-800">
                  <span className="text-lg leading-none">💰</span> Fees Outstanding
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  </div>
);

const GuardianCard = ({ student, isDark }: { student: Student; isDark: boolean }) => (
  <div className={`rounded-xl shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
    <div className={`px-6 py-4 border-b flex items-center gap-3 ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50/50 border-gray-100'}`}>
      <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-500 shadow-sm border border-gray-100'}`}>
        <User size={18} />
      </div>
      <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>Parent / Guardian</h3>
    </div>
    <div className="p-6">
      {student.parentName ? (
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-blue-600'}`}>
            <User size={24} />
          </div>
          <div className="space-y-1">
            <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.parentName}</p>
            <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Primary Guardian</p>

            {student.parentContact && (
              <div className={`flex items-center gap-2 mt-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <div className={`p-1.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <Phone size={14} />
                </div>
                <span className="font-mono font-medium">{student.parentContact}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`flex flex-col items-center justify-center py-6 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <User size={48} strokeWidth={1} className="mb-2 opacity-50" />
          <p className="text-sm italic">No guardian information on file</p>
        </div>
      )}
    </div>
  </div>
);

const EmergencyContactsCard = ({ student, isDark }: { student: Student; isDark: boolean }) => (
  <div className={`rounded-lg shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
    <div className={`px-6 py-4 border-b flex items-center gap-2 ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-amber-50 border-amber-100'}`}>
      <span className="text-lg">🚨</span>
      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-amber-800'}`}>Emergency Contacts</h3>
    </div>
    <div className="p-6">
      {student.emergencyContacts && student.emergencyContacts.length > 0 ? (
        <div className="space-y-4">
          {student.emergencyContacts.map((contact, idx) => (
            <div key={idx} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{contact.name}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{contact.relationship}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${idx === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'}`}>
                  {idx === 0 ? 'Primary' : `#${idx + 1}`}
                </span>
              </div>
              <div className={`mt-2 flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <span>📞</span>
                <span className="font-mono">{contact.phone}</span>
              </div>
              {contact.address && (
                <div className={`mt-1 flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span>📍</span>
                  <span>{contact.address}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className={`text-sm italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No emergency contacts on file</p>
      )}
    </div>
  </div>
);

const MedicalInfoCard = ({ student, isDark }: { student: Student; isDark: boolean }) => (
  <div className={`rounded-xl shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
    <div className={`px-6 py-4 border-b flex items-center gap-3 ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-red-50/50 border-red-100'}`}>
      <div className={`p-2 rounded-lg ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-white text-red-500 shadow-sm border border-red-100'}`}>
        <Heart size={18} />
      </div>
      <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-red-900'}`}>Medical Information</h3>
    </div>
    <div className="p-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Blood Group</label>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xs font-bold text-red-600 dark:text-red-400">
              {student.medicalInfo?.bloodGroup || '?'}
            </div>
            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Type</span>
          </div>
        </div>
        <div>
          <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Allergies</label>
          <div className={`mt-1 text-sm ${student.medicalInfo?.allergies ? (isDark ? 'text-red-300' : 'text-red-700') : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
            {student.medicalInfo?.allergies ? (
              <span className="flex items-start gap-1">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {student.medicalInfo.allergies}
              </span>
            ) : 'None reported'}
          </div>
        </div>
        <div className="col-span-2">
          <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Medical Conditions</label>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{student.medicalInfo?.medicalConditions || 'None reported'}</p>
        </div>
        {(student.medicalInfo?.doctorName || student.medicalInfo?.doctorPhone) && (
          <div className={`col-span-2 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Primary Physician</label>
            <div className="flex items-center gap-3 mt-2">
              <div className={`p-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <User size={14} />
              </div>
              <div>
                <p className={`text-sm font-bold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                  {student.medicalInfo?.doctorName || 'Unknown Doctor'}
                </p>
                {student.medicalInfo?.doctorPhone && (
                  <p className={`text-xs font-mono flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Phone size={10} /> {student.medicalInfo.doctorPhone}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);




const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'warning'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500'
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '!'
  };

  return (
    <div className={`fixed bottom-4 right-4 ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-slide-up`}>
      <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
        {icons[type]}
      </span>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-1">✕</button>
    </div>
  );
};

const StatCard = ({ label, value, icon, color, isDark }: { label: string; value: string | number; icon: string; color: string; isDark: boolean }) => (
  <div className={`rounded-lg border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
        <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

const HighlightText = ({ text, query }: { text: string; query: string }) => {
  if (!query.trim()) return <>{text}</>;

  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 px-0.5 rounded">{part}</mark>
        ) : part
      )}
    </>
  );
};

export const Students: React.FC = () => {
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'profile'>('list');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('All');
  const [filterStream, setFilterStream] = useState<string>('All');
  const [filterGender, setFilterGender] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortOption, setSortOption] = useState<'name' | 'index' | 'class'>('class');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteTargetStream, setPromoteTargetStream] = useState<string>('');
  const [promotionSummary, setPromotionSummary] = useState<{ [key: string]: { count: number; targetClass: string } }>({});
  const [isPromoting, setIsPromoting] = useState(false);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showIdCard, setShowIdCard] = useState(false);
  const [idCardStudent, setIdCardStudent] = useState<Student | null>(null);
  const [showBulkIdCards, setShowBulkIdCards] = useState(false);
  const [showFaceEnrollment, setShowFaceEnrollment] = useState(false);
  const [faceEnrollStudent, setFaceEnrollStudent] = useState<Student | null>(null);
  const [enrolledFaceIds, setEnrolledFaceIds] = useState<Set<number>>(new Set());
  const [activeProfileTab, setActiveProfileTab] = useState<'overview' | 'personal' | 'academic'>('overview');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'warning') => setToast({ message, type });

  const [settings, setSettings] = useState<SchoolSettings | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    indexNumber: '',
    classLevel: ClassLevel.P1,
    stream: '',
    gender: Gender.Male,
    paycode: '',
    parentName: '',
    parentContact: '',
    specialCases: { absenteeism: false, sickness: false, fees: false }
  });

  const loadData = async () => {
    const [data, s] = await Promise.all([dbService.getStudents(), dbService.getSettings()]);
    setStudents(data as any);
    setSettings(s);

    if (s && s.streams['P1'] && s.streams['P1'].length > 0) {
      setFormData(prev => ({ ...prev, stream: s.streams['P1'][0] }));
    }

    try {
      const faceResp = await fetch('/api/face-embeddings?personType=student');
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

  const stats = useMemo(() => {
    const total = students.length;
    const males = students.filter(s => s.gender === 'M').length;
    const females = students.filter(s => s.gender === 'F').length;


    const classDistribution: { [key: string]: number } = {};
    students.forEach(s => {
      classDistribution[s.classLevel] = (classDistribution[s.classLevel] || 0) + 1;
    });

    return { total, males, females, classDistribution };
  }, [students]);

  const availableStreams = useMemo(() => {
    if (filterClass === 'All') {
      const allStreams = new Set<string>();
      students.forEach(s => s.stream && allStreams.add(s.stream));
      return Array.from(allStreams).sort();
    }
    return settings?.streams[filterClass] || [];
  }, [filterClass, settings, students]);

  const handleViewProfile = (student: Student) => {
    setSelectedStudent(student);
    setActiveProfileTab('overview');
    setViewMode('profile');
  };

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setFormData({ ...student });
    setIsModalOpen(true);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedStudent(null);
  };

  const handleDelete = async (id: number | undefined) => {
    if (id === undefined || id === null) {
      showToast("Cannot delete: Student ID is missing", 'error');
      return;
    }
    if (window.confirm('Are you sure you want to delete this student? This will permanently remove the student profile AND all associated marks.')) {
      try {
        await dbService.deleteStudent(id);
        await loadData();
        await queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        await queryClient.invalidateQueries({ queryKey: ['demographics'] });
        showToast('Student deleted successfully', 'success');

        if (viewMode === 'profile') {
          handleBackToList();
        }
      } catch (error: any) {
        showToast(`Failed to delete student: ${error.message}`, 'error');
      }
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} students? This will permanently remove them and their marks.`)) {
      try {
        await dbService.deleteStudents(Array.from(selectedIds));
        setSelectedIds(new Set());
        loadData();
        await queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        await queryClient.invalidateQueries({ queryKey: ['demographics'] });
        showToast(`${selectedIds.size} students deleted successfully`, 'success');
      } catch (error: any) {
        showToast(`Failed to delete: ${error.message}`, 'error');
      }
    }
  };

  const checkDuplicateIndex = (indexNumber: string, excludeId?: number): boolean => {
    return students.some(s => s.indexNumber === indexNumber && s.id !== excludeId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.indexNumber) {

      if (checkDuplicateIndex(formData.indexNumber, formData.id)) {
        showToast(`A student with index number "${formData.indexNumber}" already exists!`, 'warning');
        return;
      }

      const cls = formData.classLevel as string;
      const str = formData.stream || '';

      if (str && settings) {
        const classStreams = settings.streams[cls] || [];
        if (!classStreams.includes(str)) {
          await dbService.addStream(cls, str);
        }
      }

      const studentToSave = {
        ...formData,
        name: formData.name.toUpperCase()
      } as Student;

      if (studentToSave.id) {
        await dbService.updateStudent(studentToSave);
        if (selectedStudent && selectedStudent.id === studentToSave.id) {
          setSelectedStudent(studentToSave);
        }
        showToast('Student updated successfully', 'success');
      } else {
        await dbService.addStudent(studentToSave);
        showToast('Student added successfully', 'success');
      }

      await queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      await queryClient.invalidateQueries({ queryKey: ['demographics'] });
      setIsModalOpen(false);
      setFormData({
        name: '',
        indexNumber: '',
        classLevel: formData.classLevel,
        stream: formData.stream,
        gender: Gender.Male,
        paycode: '',
        parentName: '',
        parentContact: '',
        specialCases: { absenteeism: false, sickness: false, fees: false }
      });
      loadData();
    }
  };

  const preparePromotionSummary = () => {
    const promotionMapping: { [key: string]: string } = {
      "P1": "P2", "P2": "P3", "P3": "P4", "P4": "P5", "P5": "P6", "P6": "P7", "P7": "Graduated"
    };

    const summary: { [key: string]: { count: number; targetClass: string } } = {};

    for (const id of selectedIds) {
      const student = students.find(s => s.id === id);
      if (!student) continue;

      const targetClass = promotionMapping[student.classLevel];
      if (targetClass) {
        if (!summary[student.classLevel]) {
          summary[student.classLevel] = { count: 0, targetClass };
        }
        summary[student.classLevel].count++;
      }
    }

    setPromotionSummary(summary);
    setShowPromoteModal(true);
  };

  const handlePromoteStudents = async () => {
    if (selectedIds.size === 0) {
      showToast('Please select students to promote', 'warning');
      return;
    }

    setIsPromoting(true);

    try {
      const response = await fetch('/api/students/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          studentIds: Array.from(selectedIds),
          targetStream: promoteTargetStream || undefined,
          academicYear: settings?.currentYear || new Date().getFullYear(),
          term: settings?.currentTerm || 3
        })
      });

      const result = await response.json();

      if (response.ok) {
        await loadData();
        setSelectedIds(new Set());
        setShowPromoteModal(false);
        setPromoteTargetStream('');
        setPromotionSummary({});
        await queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        await queryClient.invalidateQueries({ queryKey: ['demographics'] });

        let message = `Successfully promoted ${result.promotedCount} student(s)!`;
        if (result.graduatedCount > 0) {
          message += ` (${result.graduatedCount} graduated)`;
        }
        if (result.skippedCount > 0) {
          message += ` ${result.skippedCount} skipped.`;
        }

        showToast(message, result.promotedCount > 0 ? 'success' : 'warning');
      } else {
        showToast(`Promotion failed: ${result.message}`, 'error');
      }
    } catch (error: any) {
      showToast(`Promotion failed: ${error.message}`, 'error');
    } finally {
      setIsPromoting(false);
    }
  };

  const handleQuickEdit = async (studentId: number, field: string, value: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    let updatedStudent = { ...student };

    switch (field) {
      case 'name':
        updatedStudent.name = value.toUpperCase();
        break;
      case 'stream':
        updatedStudent.stream = value;
        break;
      case 'paycode':
        updatedStudent.paycode = value;
        break;
    }

    try {
      await dbService.updateStudent(updatedStudent);
      await loadData();
      showToast('Updated successfully', 'success');
    } catch (error: any) {
      showToast(`Update failed: ${error.message}`, 'error');
    }

    setEditingRowId(null);
    setEditingField(null);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const normalizeClassInput = (rawClass: string): ClassLevel => {
    const cleaned = rawClass.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (Object.values(ClassLevel).includes(cleaned as ClassLevel)) {
      return cleaned as ClassLevel;
    }
    if (cleaned.startsWith('PRIMARY')) {
      const num = cleaned.replace('PRIMARY', '');
      const candidate = 'P' + num;
      if (Object.values(ClassLevel).includes(candidate as ClassLevel)) return candidate as ClassLevel;
    }
    if (cleaned.startsWith('GRADE')) {
      const num = cleaned.replace('GRADE', '');
      const candidate = 'P' + num;
      if (Object.values(ClassLevel).includes(candidate as ClassLevel)) return candidate as ClassLevel;
    }
    if (/^\d$/.test(cleaned)) {
      const candidate = 'P' + cleaned;
      if (Object.values(ClassLevel).includes(candidate as ClassLevel)) return candidate as ClassLevel;
    }
    return ClassLevel.P1;
  };

  const exportStudentsCSV = () => {
    const headers = ['Index Number', 'Name', 'Gender', 'Class', 'Stream', 'Pay Code', 'Parent Name', 'Parent Contact'];

    const sortedStudents = [...filteredStudents].sort((a, b) => a.indexNumber.localeCompare(b.indexNumber));

    const rows = sortedStudents.map(s => [
      `"${s.indexNumber}"`,
      `"${s.name}"`,
      s.gender,
      s.classLevel,
      `"${s.stream}"`,
      `"${s.paycode || ''}"`,
      `"${s.parentName || ''}"`,
      `"${s.parentContact || ''}"`
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Students_Export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${sortedStudents.length} students`, 'success');
  };

  const downloadImportTemplate = () => {
    const headers = ['Index Number', 'Name', 'Gender', 'Class', 'Stream', 'Pay Code', 'Parent Name', 'Parent Contact'];
    const CENTRE_NUMBER = settings?.centreNumber || "670135";

    const sampleRows = [
      `"${CENTRE_NUMBER}/001","SAMPLE STUDENT NAME",M,P4,"Red","1004452753","",""`,
      `"${CENTRE_NUMBER}/002","ANOTHER STUDENT",F,P5,"Blue","1004452754","Parent Name","0700123456"`,
    ];

    const csvContent = [headers.join(','), ...sampleRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Students_Import_Template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/[\s_-]/g, ''),
      complete: async (results) => {
        try {
          const newStudents: Student[] = [];
          const rows = results.data as any[];
          const CENTRE_NUMBER = settings?.centreNumber || "670135";

          let duplicates = 0;
          let addedCount = 0;
          const detectedStreams: { [key: string]: Set<string> } = {};

          // Find the highest existing index number suffix to avoid duplicates for auto-generated IDs
          const existingIndexSuffixes = students
            .map(s => {
              const match = s.indexNumber.match(/\/(\d+)$/);
              return match ? parseInt(match[1], 10) : 0;
            })
            .filter(n => !isNaN(n));
          let nextIndexSuffix = existingIndexSuffixes.length > 0 ? Math.max(...existingIndexSuffixes) + 1 : 1;
          for (const row of rows) {
            const name = row.name || row.fullname || `${row.firstname || ''} ${row.lastname || ''}`.trim();

            if (!name) {
              continue;
            }

            let indexNumber = row.indexnumber || row.index || '';
            if (!indexNumber) {
              const indexSuffix = String(nextIndexSuffix).padStart(3, '0');
              indexNumber = `${CENTRE_NUMBER}/${indexSuffix}`;
              nextIndexSuffix++;
            }

            // Check for duplicates
            const isDuplicate = students.some(s =>
              s.indexNumber === indexNumber ||
              (s.name.toLowerCase() === name.toLowerCase())
            ) || newStudents.some(s => s.indexNumber === indexNumber);

            if (isDuplicate) {
              duplicates++;
              continue;
            }

            let gender = Gender.Male;
            const genderRaw = (row.gender || row.sex || '').toUpperCase();
            if (genderRaw === 'F' || genderRaw === 'FEMALE') gender = Gender.Female;

            const classRaw = row.class || row.classlevel || row.grade || '';
            const classLevel = normalizeClassInput(classRaw);

            const stream = (row.stream || row.section || '').toUpperCase().trim() || 'Blue';

            if (classLevel && stream) {
              if (!detectedStreams[classLevel]) detectedStreams[classLevel] = new Set();
              detectedStreams[classLevel].add(stream);
            }

            const student: Student = {
              indexNumber,
              name: name.toUpperCase(),
              gender,
              classLevel,
              stream,
              paycode: row.paycode || row.paymentcode || '',
              parentName: row.parentname || row.guardianname || '',
              parentContact: row.parentcontact || row.phone || row.contact || '',
              specialCases: { absenteeism: false, sickness: false, fees: false }
            };

            newStudents.push(student);
            addedCount++;
          }

          if (newStudents.length > 0) {
            const currentSettings = await dbService.getSettings();
            const updatedStreams = { ...currentSettings.streams };

            for (const [classLevel, streamSet] of Object.entries(detectedStreams)) {
              const existingStreams = updatedStreams[classLevel] || [];
              const newStreamsArray = Array.from(streamSet);
              const mergedStreams = [...new Set([...existingStreams, ...newStreamsArray])];
              updatedStreams[classLevel] = mergedStreams;
            }

            await dbService.saveSettings({ ...currentSettings, streams: updatedStreams });
            await dbService.saveSettings({ ...currentSettings, streams: updatedStreams });
            await dbService.addStudents(newStudents);
            await queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            await queryClient.invalidateQueries({ queryKey: ['demographics'] });

            let msg = `Successfully imported ${addedCount} students.`;
            if (duplicates > 0) msg += ` ${duplicates} duplicates skipped.`;
            showToast(msg, 'success');
            loadData();
          } else {
            let msg = "No valid new students found.";
            if (duplicates > 0) msg += ` ${duplicates} duplicates skipped.`;
            showToast(msg, 'warning');
          }
        } catch (error: any) {
          console.error("CSV Import Error:", error);
          showToast(`Error processing CSV: ${error.message}`, 'error');
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (error: any) => {
        setImporting(false);
        showToast(`CSV Parsing Error: ${error.message}`, 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };














  let filteredStudents = students.filter(s =>
  ((s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.indexNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.paycode && s.paycode.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  if (filterClass !== 'All') {
    filteredStudents = filteredStudents.filter(s => s.classLevel === filterClass);
  }

  if (filterStream !== 'All') {
    filteredStudents = filteredStudents.filter(s => s.stream === filterStream);
  }

  if (filterGender !== 'All') {
    filteredStudents = filteredStudents.filter(s => s.gender === filterGender);
  }

  if (filterStatus !== 'All') {
    filteredStudents = filteredStudents.filter(s => {

      if (filterStatus === 'medical') return s.specialCases?.sickness;
      if (filterStatus === 'absent') return s.specialCases?.absenteeism;
      if (filterStatus === 'active') return !s.specialCases?.fees && !s.specialCases?.sickness && !s.specialCases?.absenteeism;
      return true;
    });
  }

  filteredStudents.sort((a, b) => {
    if (sortOption === 'name') return a.name.localeCompare(b.name);
    if (sortOption === 'class') {
      const classCompare = a.classLevel.localeCompare(b.classLevel);
      if (classCompare !== 0) return classCompare;
      return a.name.localeCompare(b.name);
    }
    if (sortOption === 'index') return a.indexNumber.localeCompare(b.indexNumber);
    return 0;
  });

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterClass, filterStream, filterGender, filterStatus]);

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
    const pageIds = paginatedStudents.map(s => s.id!);
    const allPageSelected = pageIds.every(id => selectedIds.has(id));

    if (allPageSelected) {
      const newSet = new Set(selectedIds);
      pageIds.forEach(id => newSet.delete(id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      pageIds.forEach(id => newSet.add(id));
      setSelectedIds(newSet);
    }
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredStudents.map(s => s.id!);
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id));

    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIds));
    }
  };

  const pageIds = paginatedStudents.map(s => s.id!);
  const allPageSelected = paginatedStudents.length > 0 && pageIds.every(id => selectedIds.has(id));
  const somePageSelected = pageIds.some(id => selectedIds.has(id));
  const indeterminate = somePageSelected && !allPageSelected;

  const filteredIds = filteredStudents.map(s => s.id!);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id));

  if (viewMode === 'profile' && selectedStudent) {
    return (
      <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
        <ProfileHeader
          student={selectedStudent}
          onEdit={() => handleEdit(selectedStudent)}
          onBack={handleBackToList}
          onPrintID={() => {
            setIdCardStudent(selectedStudent);
            setShowIdCard(true);
          }}
          onEnrollFace={() => {
            setFaceEnrollStudent(selectedStudent);
            setShowFaceEnrollment(true);
          }}
          hasFaceEnrolled={enrolledFaceIds.has(selectedStudent.id!)}
          isDark={isDark}
        />

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveProfileTab('overview')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${activeProfileTab === 'overview'
                ? `border-primary-600 text-primary-600 ${isDark ? 'text-primary-400 border-primary-400' : ''}`
                : `border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 ${isDark ? 'text-gray-400 hover:text-gray-300' : ''}`
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveProfileTab('personal')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${activeProfileTab === 'personal'
                ? `border-primary-600 text-primary-600 ${isDark ? 'text-primary-400 border-primary-400' : ''}`
                : `border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 ${isDark ? 'text-gray-400 hover:text-gray-300' : ''}`
              }`}
          >
            Personal Details
          </button>
          <button
            onClick={() => setActiveProfileTab('academic')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${activeProfileTab === 'academic'
                ? `border-primary-600 text-primary-600 ${isDark ? 'text-primary-400 border-primary-400' : ''}`
                : `border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 ${isDark ? 'text-gray-400 hover:text-gray-300' : ''}`
              }`}
          >
            Academic History
          </button>
        </div>

        <div className="space-y-6 min-h-[400px]">
          {activeProfileTab === 'overview' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AttendanceSummaryCard studentId={selectedStudent.id!} isDark={isDark} />
                <PerformanceTrendCard studentId={selectedStudent.id!} isDark={isDark} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Quick Info Cards to fill space if needed, or just status summary */}
                <div className={`col-span-1 md:col-span-3 rounded-lg border p-4 flex items-center justify-between ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                      <School size={24} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Current Enrollment</p>
                      <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedStudent.classLevel} - {selectedStudent.stream}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 border-l pl-4 dark:border-gray-700">
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</p>
                      <div className="flex gap-2 mt-1">
                        {selectedStudent.specialCases?.fees && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-bold">Fees Due</span>}
                        {!selectedStudent.specialCases?.fees && <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-bold">Good Standing</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeProfileTab === 'personal' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <PersonalInfoCard student={selectedStudent} isDark={isDark} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GuardianCard student={selectedStudent} isDark={isDark} />
                <MedicalInfoCard student={selectedStudent} isDark={isDark} />
              </div>
              <EmergencyContactsCard student={selectedStudent} isDark={isDark} />
            </div>
          )}

          {activeProfileTab === 'academic' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <PerformanceTrendCard studentId={selectedStudent.id!} isDark={isDark} />
              <AcademicHistory studentId={selectedStudent.id!} isDark={isDark} />
            </div>
          )}
        </div>

        <div className={`mt-8 pt-6 border-t flex justify-between items-center ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Student ID: <span className="font-mono">{selectedStudent.id}</span>
          </div>
          <Button variant="danger" size="sm" onClick={() => handleDelete(selectedStudent.id)}>
            <Trash2 size={14} className="mr-2" />
            Delete Learner Record
          </Button>
        </div>

        {showIdCard && idCardStudent && (
          <StudentIDCard
            student={idCardStudent}
            settings={settings}
            onClose={() => {
              setShowIdCard(false);
              setIdCardStudent(null);
            }}
          />
        )}

        {showFaceEnrollment && faceEnrollStudent && (
          <React.Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white dark:bg-gray-800 rounded-xl p-8"><div className="animate-spin w-8 h-8 border-4 border-[#800020] border-t-transparent rounded-full"></div></div></div>}>
            <FaceEnrollment
              personId={faceEnrollStudent.id!}
              personType="student"
              personName={faceEnrollStudent.name}
              onSuccess={() => {
                setShowFaceEnrollment(false);
                setFaceEnrollStudent(null);
                setEnrolledFaceIds(prev => new Set([...prev, faceEnrollStudent.id!]));
                showToast('Face enrolled successfully!', 'success');
              }}
              onCancel={() => {
                setShowFaceEnrollment(false);
                setFaceEnrollStudent(null);
              }}
            />
          </React.Suspense>
        )}

        {isModalOpen && (
          <StudentFormWizard
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={async (data) => {
              if (data.id) {
                await dbService.updateStudent(data as Student);
                showToast('Student updated successfully!', 'success');
              } else {
                await dbService.addStudent(data as Student);
                showToast('Student updated successfully!', 'success');
              }
              loadData();
            }}
            initialData={selectedStudent || undefined}
            settings={settings}
            isDark={isDark}
            students={students}
          />
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Students Directory</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manage learner profiles, enrollments, and details.</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {selectedIds.size > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowBulkIdCards(true)}
              >
                Print ID Cards ({selectedIds.size})
              </Button>
              <Button variant="secondary" onClick={preparePromotionSummary}>
                Promote ({selectedIds.size})
              </Button>
              <Button variant="danger" onClick={handleBatchDelete}>
                Delete ({selectedIds.size})
              </Button>
            </>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
          <Button variant="secondary" onClick={downloadImportTemplate} size="sm">
            Template
          </Button>
          <Button variant="outline" onClick={handleImportClick} disabled={importing}>
            {importing ? 'Importing...' : 'Import CSV'}
          </Button>
          <Button variant="outline" onClick={exportStudentsCSV}>
            Export CSV
          </Button>
          <Button onClick={() => {
            const defaultClass = ClassLevel.P1;
            const defaultStream = settings?.streams[defaultClass]?.[0] || '';
            setFormData({
              name: '', indexNumber: '', classLevel: defaultClass, stream: defaultStream, gender: Gender.Male, paycode: '', parentName: '', parentContact: '',
              specialCases: { absenteeism: false, sickness: false, fees: false }
            });
            setIsModalOpen(true);
          }}>
            Add Student
          </Button>
        </div>
      </div>

      {/* Stats Cards overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-xl border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Learners</div>
          <div className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{filteredStudents.length}</div>
          <div className="text-xs text-primary-600 mt-1 font-medium">100% of selected</div>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Gender Split</div>
          <div className="flex items-end gap-2 mt-1">
            <div className="flex flex-col">
              <span className={`text-xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                {filteredStudents.filter(s => s.gender === 'M').length}
              </span>
              <span className="text-[10px] uppercase text-gray-500">Male</span>
            </div>
            <div className={`h-8 w-[1px] ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            <div className="flex flex-col">
              <span className={`text-xl font-bold ${isDark ? 'text-pink-400' : 'text-pink-600'}`}>
                {filteredStudents.filter(s => s.gender === 'F').length}
              </span>
              <span className="text-[10px] uppercase text-gray-500">Female</span>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Boarding Status</div>
          <div className="mt-1">
            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {filteredStudents.filter(s => s.boardingStatus === 'boarding').length}
            </div>
            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Total Boarders
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Boarders by Gender</div>
          <div className="flex items-end gap-3 mt-1">
            <div>
              <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {filteredStudents.filter(s => s.boardingStatus === 'boarding' && s.gender === 'M').length}
              </span>
              <span className={`block text-[10px] ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>Boys</span>
            </div>
            <div>
              <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {filteredStudents.filter(s => s.boardingStatus === 'boarding' && s.gender === 'F').length}
              </span>
              <span className={`block text-[10px] ${isDark ? 'text-pink-300' : 'text-pink-600'}`}>Girls</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Toolbar */}
      <div className={`sticky top-0 z-10 p-4 rounded-xl shadow-sm border backdrop-blur-xl transition-all ${isDark ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-gray-200'}`}>
        <div className="flex flex-col lg:flex-row gap-4 justify-between">

          {/* Search Bar */}
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`w-5 h-5 transition-colors ${isDark ? 'text-gray-500 group-focus-within:text-primary-400' : 'text-gray-400 group-focus-within:text-primary-500'}`} />
            </div>
            <input
              type="text"
              placeholder="Search students..."
              className={`block w-full pl-10 pr-4 py-2.5 border rounded-lg leading-5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark ? 'bg-gray-900/50 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-3">

            <div className="flex items-center gap-2 p-1 rounded-lg border bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? (isDark ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-primary-600 shadow-sm') : (isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')}`}
              >
                <ListIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? (isDark ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-primary-600 shadow-sm') : (isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <div className={`h-8 w-[1px] ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>

            <select
              className={`px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-700'}`}
              value={filterClass}
              onChange={(e) => { setFilterClass(e.target.value); setFilterStream('All'); }}
            >
              <option value="All">All Classes</option>
              {Object.values(ClassLevel).map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              className={`px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-700'}`}
              value={availableStreams.length > 0 ? filterStream : 'All'}
              onChange={(e) => setFilterStream(e.target.value)}
              disabled={availableStreams.length === 0}
            >
              <option value="All">All Streams</option>
              {availableStreams.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Active Filters Summary (Optional) */}
        {(filterClass !== 'All' || filterStream !== 'All' || filterGender !== 'All' || filterStatus !== 'All') && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {/* Reset Button could go here */}
          </div>
        )}
      </div>



      <div className={`flex items-center justify-between text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        <div className="flex items-center gap-3">
          <span>Showing {paginatedStudents.length} of {filteredStudents.length} students</span>
          {filteredStudents.length > 0 && (
            <button
              onClick={toggleSelectAllFiltered}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${allFilteredSelected
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                : 'bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-900 dark:text-primary-300 dark:hover:bg-primary-800'
                }`}
            >
              {allFilteredSelected ? 'Unselect All' : `Select All (${filteredStudents.length})`}
            </button>
          )}
        </div>
        {selectedIds.size > 0 && <span className="font-medium text-primary-600">{selectedIds.size} selected</span>}
      </div>

      {viewMode === 'list' && (
        <>
          <div className="hidden md:block">
            <div className={`shadow rounded-lg overflow-hidden border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={isDark ? 'bg-gray-750' : 'bg-gray-50'}>
                    <tr>
                      <th className="px-4 py-3 text-left w-10">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer w-4 h-4"
                          checked={allPageSelected}
                          ref={el => el && (el.indeterminate = indeterminate)}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Learner</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Details</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Class Info</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                      <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {paginatedStudents.map((student) => (
                      <tr key={student.id} className={`transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-blue-50'} group`}>
                        <td className="px-4 py-4 text-left">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer w-4 h-4"
                            checked={selectedIds.has(student.id!)}
                            onChange={() => toggleSelection(student.id!)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => handleViewProfile(student)}>
                          <div className="flex items-center">
                            {student.photoBase64 ? (
                              <img src={student.photoBase64} alt="" className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${isDark ? 'bg-primary-900 text-primary-300' : 'bg-primary-50 text-primary-600'}`}>
                                {student.name.substring(0, 2)}
                              </div>
                            )}
                            <div className="ml-4">
                              {editingRowId === student.id && editingField === 'name' ? (
                                <input
                                  type="text"
                                  className={`text-sm font-medium px-2 py-1 border rounded ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleQuickEdit(student.id!, 'name', editValue)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleQuickEdit(student.id!, 'name', editValue)}
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <div
                                  className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
                                  onDoubleClick={(e) => { e.stopPropagation(); setEditingRowId(student.id!); setEditingField('name'); setEditValue(student.name); }}
                                >
                                  <HighlightText text={student.name} query={searchQuery} />
                                </div>
                              )}
                              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                <HighlightText text={student.indexNumber} query={searchQuery} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => handleViewProfile(student)}>
                          <div className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{student.gender === 'M' ? 'Male' : 'Female'}</div>
                          {editingRowId === student.id && editingField === 'paycode' ? (
                            <input
                              type="text"
                              className={`text-xs px-2 py-0.5 border rounded w-24 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleQuickEdit(student.id!, 'paycode', editValue)}
                              onKeyDown={(e) => e.key === 'Enter' && handleQuickEdit(student.id!, 'paycode', editValue)}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <div
                              className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                              onDoubleClick={(e) => { e.stopPropagation(); setEditingRowId(student.id!); setEditingField('paycode'); setEditValue(student.paycode || ''); }}
                            >
                              <HighlightText text={student.paycode || '-'} query={searchQuery} />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => handleViewProfile(student)}>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                            {student.classLevel}
                          </span>
                          {editingRowId === student.id && editingField === 'stream' ? (
                            <input
                              type="text"
                              className={`ml-2 text-sm px-2 py-0.5 border rounded w-20 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleQuickEdit(student.id!, 'stream', editValue)}
                              onKeyDown={(e) => e.key === 'Enter' && handleQuickEdit(student.id!, 'stream', editValue)}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span
                              className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                              onDoubleClick={(e) => { e.stopPropagation(); setEditingRowId(student.id!); setEditingField('stream'); setEditValue(student.stream); }}
                            >
                              {student.stream}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => handleViewProfile(student)}>
                          {student.specialCases?.sickness || student.specialCases?.absenteeism ?
                            <span className="text-xs text-yellow-600 font-medium bg-yellow-50 dark:bg-yellow-900 dark:text-yellow-300 px-2 py-1 rounded">Flagged</span> :
                            <span className="text-xs text-green-600 font-medium bg-green-50 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded">Active</span>
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleViewProfile(student); }}
                            className="text-primary-600 hover:text-primary-900 p-1"
                            title="View Profile"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(student); }}
                            className={`p-1 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Edit Student"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(student.id); }}
                            className="text-red-400 hover:text-red-600 p-1 transition-colors"
                            title="Delete Student"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {paginatedStudents.length === 0 && (
                      <tr><td colSpan={6} className={`px-6 py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No students found matching your search.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {paginatedStudents.map((student) => (
              <div
                key={student.id}
                className={`rounded-lg border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                onClick={() => handleViewProfile(student)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer w-4 h-4 mt-1"
                      checked={selectedIds.has(student.id!)}
                      onChange={() => toggleSelection(student.id!)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {student.photoBase64 ? (
                      <img src={student.photoBase64} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${isDark ? 'bg-primary-900 text-primary-300' : 'bg-primary-50 text-primary-600'}`}>
                        {student.name.substring(0, 2)}
                      </div>
                    )}
                    <div>
                      <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        <HighlightText text={student.name} query={searchQuery} />
                      </div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <HighlightText text={student.indexNumber} query={searchQuery} />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                      {student.classLevel}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{student.stream}</span>
                  </div>
                </div>
                <div className={`mt-3 pt-3 border-t flex justify-between items-center ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div className="flex gap-4 text-xs">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{student.gender === 'M' ? 'Male' : 'Female'}</span>
                    {student.paycode && <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Pay: {student.paycode}</span>}
                  </div>
                  {student.specialCases?.sickness || student.specialCases?.absenteeism ?
                    <span className="text-xs text-yellow-600 font-medium bg-yellow-50 dark:bg-yellow-900 dark:text-yellow-300 px-2 py-0.5 rounded">Flagged</span> :
                    <span className="text-xs text-green-600 font-medium bg-green-50 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded">Active</span>
                  }
                </div>
              </div>
            ))}
            {paginatedStudents.length === 0 && (
              <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No students found matching your search.</div>
            )}
          </div>
        </>
      )}

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedStudents.map((student) => (
            <div key={student.id} onClick={() => handleViewProfile(student)}
              className={`group relative flex flex-col rounded-xl shadow-sm border overflow-hidden cursor-pointer transition-all hover:shadow-md ${isDark ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-primary-200'}`}>
              <div className={`h-24 ${isDark ? 'bg-gray-750' : 'bg-gradient-to-br from-primary-50 to-primary-100'}`}></div>
              <div className="px-5 pt-0 pb-5 flex-1 flex flex-col">
                <div className="relative -mt-12 mb-3 self-center">
                  <div className={`h-24 w-24 rounded-full p-1 shadow-md ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    {student.photoBase64 ? (
                      <img src={student.photoBase64} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <div className={`h-full w-full rounded-full flex items-center justify-center text-2xl font-bold ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-primary-100 text-primary-600'}`}>
                        {student.name.substring(0, 2)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center mb-4">
                  <h3 className={`font-bold text-lg truncate px-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.name}</h3>
                  <p className={`text-sm font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{student.indexNumber}</p>
                </div>

                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                    {student.classLevel} {student.stream}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${student.gender === 'M' ? (isDark ? 'bg-sky-900 text-sky-300' : 'bg-sky-100 text-sky-800') : (isDark ? 'bg-pink-900 text-pink-300' : 'bg-pink-100 text-pink-800')}`}>
                    {student.gender === 'M' ? 'Male' : 'Female'}
                  </span>
                </div>

                <div className={`mt-auto pt-3 border-t flex items-center justify-between text-xs ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-500'}`}>
                  <span className="flex items-center gap-1">
                    {student.boardingStatus === 'boarding' ? '🛏️ Boarder' : '🏠 Day Scholar'}
                  </span>
                  {student.specialCases?.fees && <span className="text-red-500 font-medium">Fees Due</span>}
                </div>
              </div>
            </div>
          ))}
          {paginatedStudents.length === 0 && (
            <div className={`col-span-full text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No students found matching your search.</div>
          )}
        </div>
      )}

      {
        totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded border text-sm ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50'}`}
            >
              Previous
            </button>

            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded text-sm ${currentPage === pageNum
                      ? 'bg-primary-600 text-white'
                      : isDark ? 'border border-gray-600 text-gray-300 hover:bg-gray-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded border text-sm ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50'}`}
            >
              Next
            </button>
          </div>
        )
      }

      {
        isModalOpen && (
          <StudentFormWizard
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={async (data) => {
              if (data.id) {
                await dbService.updateStudent(data as Student);
                showToast('Student updated successfully!', 'success');
              } else {
                await dbService.addStudent(data as Student);
                showToast('Student added successfully!', 'success');
              }
              loadData();
            }}
            initialData={formData.id ? (formData as Student) : undefined}
            settings={settings}
            isDark={isDark}
            students={students}
          />
        )
      }

      {
        showPromoteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className={`rounded-lg shadow-xl max-w-lg w-full p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Batch Promotion</h2>

              <div className={`mb-4 p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Promotion Summary</h3>
                <div className="space-y-2">
                  {Object.entries(promotionSummary).map(([fromClass, info]: [string, { count: number; targetClass: string }]) => (
                    <div key={fromClass} className={`flex items-center justify-between p-2 rounded ${isDark ? 'bg-gray-600' : 'bg-white'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                          {fromClass}
                        </span>
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>→</span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${info.targetClass === 'Graduated' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'}`}>
                          {info.targetClass}
                        </span>
                      </div>
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {info.count} student{info.count > 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Assign Stream (Optional)
                </label>
                <select
                  value={promoteTargetStream}
                  onChange={(e) => setPromoteTargetStream(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">Keep existing stream</option>
                  {settings?.streams && Object.entries(settings.streams).map(([cls, streams]) => (
                    <optgroup key={cls} label={cls}>
                      {(streams as string[]).map((stream: string) => (
                        <option key={`${cls}-${stream}`} value={stream}>{stream}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  If selected, all promoted students will be assigned to this stream
                </p>
              </div>

              <div className={`p-3 rounded-lg mb-4 ${isDark ? 'bg-yellow-900/30 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
                <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
                  <strong>Note:</strong> P7 students will be marked as "Graduated" and will no longer appear in regular class lists.
                  Their academic history will be preserved.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPromoteModal(false);
                    setPromoteTargetStream('');
                    setPromotionSummary({});
                  }}
                  disabled={isPromoting}
                >
                  Cancel
                </Button>
                <Button onClick={handlePromoteStudents} disabled={isPromoting}>
                  {isPromoting ? 'Promoting...' : `Promote ${selectedIds.size} Student${selectedIds.size > 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {
        showIdCard && idCardStudent && (
          <StudentIDCard
            student={idCardStudent}
            settings={settings}
            onClose={() => {
              setShowIdCard(false);
              setIdCardStudent(null);
            }}
          />
        )
      }

      {
        showBulkIdCards && (
          <BulkIDCardPrint
            students={students.filter(s => s.id && selectedIds.has(s.id))}
            settings={settings}
            onClose={() => setShowBulkIdCards(false)}
          />
        )
      }

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div >
  );
};



const StudentModal = ({ isOpen, onClose, onSubmit, formData, setFormData, isEdit, settings, isDark }: any) => {
  const inputClasses = `mt-1 block w-full rounded-lg border px-4 py-3 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 focus:outline-none text-base transition-all duration-200 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`;

  const currentStreams = settings?.streams[formData.classLevel] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className={`rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-2xl p-4 sm:p-6 border max-h-[95vh] sm:max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`flex justify-between items-center border-b pb-3 mb-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{isEdit ? 'Edit Student Profile' : 'Register New Student'}</h2>
          <button onClick={onClose} className={`p-2 rounded-full ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <h3 className={`text-sm font-medium uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Academic Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Full Name (Uppercase)</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                  required
                  placeholder="e.g. MUKASA JOHN"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Index Number</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={formData.indexNumber}
                  onChange={e => setFormData({ ...formData, indexNumber: e.target.value })}
                  placeholder="000/000"
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>School Paycode</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={formData.paycode}
                  onChange={e => setFormData({ ...formData, paycode: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Class</label>
                <select
                  className={inputClasses}
                  value={formData.classLevel}
                  onChange={e => {
                    const newClass = e.target.value as ClassLevel;
                    const newStreams = settings?.streams[newClass] || [];
                    setFormData({
                      ...formData,
                      classLevel: newClass,
                      stream: newStreams.length > 0 ? newStreams[0] : ''
                    });
                  }}
                >
                  {Object.values(ClassLevel).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Stream</label>
                <input
                  type="text"
                  list="streams-list"
                  className={inputClasses}
                  value={formData.stream}
                  onChange={e => setFormData({ ...formData, stream: e.target.value })}
                  placeholder="Select or type stream..."
                />
                <datalist id="streams-list">
                  {currentStreams.map((s: string) => <option key={s} value={s} />)}
                </datalist>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Type a new name to create a stream for this class.</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className={`text-sm font-medium uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Personal & Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Gender</label>
                <select
                  className={inputClasses}
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value as Gender })}
                >
                  <option value={Gender.Male}>Male</option>
                  <option value={Gender.Female}>Female</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Boarding Status</label>
                <select
                  className={inputClasses}
                  value={formData.boardingStatus || 'day'}
                  onChange={e => setFormData({ ...formData, boardingStatus: e.target.value })}
                >
                  <option value="day">Day Scholar</option>
                  <option value="boarding">Boarder</option>
                </select>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Boarders can be assigned to dormitories and tracked via boarding roll calls.</p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Parent/Guardian Name</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={formData.parentName || ''}
                  onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                  placeholder="Mr. Parent Name"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Contact Phone</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={formData.parentContact || ''}
                  onChange={e => setFormData({ ...formData, parentContact: e.target.value })}
                  placeholder="07XX XXX XXX"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className={`text-sm font-medium uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Administrative Flags</h3>
            <div className={`p-4 rounded-lg border grid grid-cols-1 sm:grid-cols-3 gap-3 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>

              <label className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                  checked={formData.specialCases?.sickness}
                  onChange={e => setFormData({ ...formData, specialCases: { ...formData.specialCases!, sickness: e.target.checked } })}
                />
                <span className={`text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Medical Condition</span>
              </label>
              <label className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                  checked={formData.specialCases?.absenteeism}
                  onChange={e => setFormData({ ...formData, specialCases: { ...formData.specialCases!, absenteeism: e.target.checked } })}
                />
                <span className={`text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Chronic Absenteeism</span>
              </label>
            </div>
          </div>



          <div className={`flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t mt-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <Button variant="outline" type="button" onClick={onClose} className="w-full sm:w-auto py-3 text-base">Cancel</Button>
            <Button type="submit" className="w-full sm:w-auto py-3 text-base">Save Student</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
