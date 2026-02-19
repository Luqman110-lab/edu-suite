
import { AttendanceTeacher, TeacherRecord, AttendanceSettings, FaceEmbedding } from '../types/attendance';

export const fetchTeachers = async (): Promise<AttendanceTeacher[]> => {
    const res = await fetch('/api/teachers', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch teachers');
    return res.json();
};

export const fetchAttendanceRecords = async (date: string): Promise<TeacherRecord[]> => {
    const res = await fetch(`/api/teacher-attendance?date=${date}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch attendance records');
    return res.json();
};

export const fetchAttendanceSettings = async (): Promise<AttendanceSettings> => {
    const res = await fetch('/api/attendance-settings', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch attendance settings');
    return res.json();
};

export const fetchFaceEmbeddings = async (): Promise<FaceEmbedding[]> => {
    const res = await fetch('/api/face-embeddings?personType=teacher', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch face embeddings');
    return res.json();
};

export const checkIn = async (teacherId: number, method: string, locationData?: any) => {
    const payload: any = { teacherId, method, ...locationData };
    const res = await fetch('/api/teacher-attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
    });
    return res.json();
};

export const checkOut = async (teacherId: number, method: string) => {
    const res = await fetch('/api/teacher-attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ teacherId, method }),
    });
    return res.json();
};

export const markLeave = async (teacherId: number, date: string, leaveType: string, notes: string) => {
    const res = await fetch('/api/teacher-attendance/mark-leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ teacherId, date, leaveType, notes }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to mark leave');
    }
    return res.json();
};
