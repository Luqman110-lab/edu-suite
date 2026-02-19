
import { GateStudent, GateRecord, GateSettings } from '../types/gate';
import { FaceEmbedding } from '../types/attendance';

export const fetchGateStudents = async (): Promise<GateStudent[]> => {
    const res = await fetch('/api/students', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch students');
    const allStudents: GateStudent[] = await res.json();
    return allStudents.filter((s: GateStudent) => s.boardingStatus === 'day' || !s.boardingStatus);
};

export const fetchGateRecords = async (date: string): Promise<GateRecord[]> => {
    const res = await fetch(`/api/gate-attendance?date=${date}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch gate records');
    return res.json();
};

export const fetchGateSettings = async (): Promise<GateSettings> => {
    const res = await fetch('/api/attendance-settings', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch gate settings');
    return res.json();
};

export const fetchStudentFaceEmbeddings = async (): Promise<FaceEmbedding[]> => {
    const res = await fetch('/api/face-embeddings?personType=student', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch face embeddings');
    return res.json();
};

export const scanGate = async (studentId: number, method: string, mode: 'check-in' | 'check-out') => {
    const endpoint = mode === 'check-in'
        ? '/api/gate-attendance/check-in'
        : '/api/gate-attendance/check-out';

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ studentId, method }),
    });
    return res.json();
};

export const markAbsent = async (date: string) => {
    const res = await fetch('/api/gate-attendance/mark-absent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ date }),
    });
    if (!res.ok) throw new Error('Failed to mark absent');
    return res.json();
};
