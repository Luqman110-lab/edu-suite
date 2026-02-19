import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../services/api';

interface AttendanceRecord {
    id: number;
    studentId: number;
    date: string;
    status: 'present' | 'absent' | 'late';
    // ... other fields
}

export const useAttendance = (date?: string, classLevel?: string) => {
    const queryClient = useQueryClient();

    // Fetch attendance
    const attendanceQuery = useQuery({
        queryKey: ['attendance', date, classLevel],
        queryFn: () => apiRequest<AttendanceRecord[]>('GET', `/attendance?date=${date}&classLevel=${classLevel}`),
        enabled: !!date,
        staleTime: 1000 * 60 * 5,
    });

    // Mark attendance
    const markAttendance = useMutation({
        mutationFn: (records: Omit<AttendanceRecord, 'id'>[]) => apiRequest<void>('POST', '/attendance', { records }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] }); // Updates attendance stats
        },
    });

    return {
        attendance: attendanceQuery.data || [],
        isLoading: attendanceQuery.isLoading,
        isError: attendanceQuery.isError,
        error: attendanceQuery.error,
        refetch: attendanceQuery.refetch,
        markAttendance,
    };
};
