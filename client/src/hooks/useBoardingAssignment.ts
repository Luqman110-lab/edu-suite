import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Dormitory {
    id: number;
    name: string;
    gender: string;
    capacity: number;
}

export interface Bed {
    id: number;
    dormitoryId: number;
    bedNumber: string;
    level: string;
    status: 'vacant' | 'occupied' | 'maintenance';
    currentStudentId: number | null;
    studentName: string | null;
    classLevel: string | null;
    mattressNumber: string | null;
}

export interface CurrentBedAssignment {
    bed: Bed;
    dormitory: Dormitory;
}

export function useBoardingAssignment(studentId?: number) {
    const queryClient = useQueryClient();

    // Fetch all dormitories
    const { data: dormitories = [], isLoading: dormsLoading } = useQuery<Dormitory[]>({
        queryKey: ['dormitories'],
        queryFn: async () => {
            const res = await fetch('/api/dormitories', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch dormitories');
            return res.json();
        },
        staleTime: 2 * 60 * 1000,
    });

    // Fetch beds for a specific dormitory
    const getBeds = (dormitoryId: number | null) => {
        return useQuery<Bed[]>({
            queryKey: ['beds', dormitoryId],
            queryFn: async () => {
                if (!dormitoryId) return [];
                const res = await fetch(`/api/beds?dormitoryId=${dormitoryId}`, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to fetch beds');
                return res.json();
            },
            enabled: !!dormitoryId,
            staleTime: 30 * 1000,
        });
    };

    // Fetch current bed assignment for this student
    const { data: currentAssignment, isLoading: assignmentLoading } = useQuery<CurrentBedAssignment | null>({
        queryKey: ['student-bed', studentId],
        queryFn: async () => {
            if (!studentId) return null;
            const res = await fetch(`/api/students/${studentId}/bed`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch student bed');
            return res.json();
        },
        enabled: !!studentId,
        staleTime: 30 * 1000,
    });

    // Assign a bed to this student
    const assignBed = useMutation({
        mutationFn: async ({ bedId, studentId: sid }: { bedId: number; studentId: number }) => {
            const res = await fetch(`/api/beds/${bedId}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ studentId: sid }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to assign bed');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student-bed', studentId] });
            queryClient.invalidateQueries({ queryKey: ['beds'] });
            queryClient.invalidateQueries({ queryKey: ['boarding-stats'] });
        },
    });

    // Unassign the student's current bed
    const unassignBed = useMutation({
        mutationFn: async (bedId: number) => {
            const res = await fetch(`/api/beds/${bedId}/unassign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to unassign bed');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student-bed', studentId] });
            queryClient.invalidateQueries({ queryKey: ['beds'] });
            queryClient.invalidateQueries({ queryKey: ['boarding-stats'] });
        },
    });

    return {
        dormitories,
        dormsLoading,
        currentAssignment: currentAssignment ?? null,
        assignmentLoading,
        getBeds,
        assignBed,
        unassignBed,
    };
}
