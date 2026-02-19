import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../services/api';

interface DashboardStats {
    students: { total: number; present: number };
    revenue: { total: number; outstanding: number };
}

interface RevenueTrend {
    name: string;
    revenue: number;
}

interface UpcomingEvent {
    id: number;
    subject: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
}

interface AcademicPerformance {
    // Define structure as needed
    average: number;
}

interface Demographics {
    // Define structure
}

export const useDashboardStats = (schoolId?: number) => {
    return useQuery({
        queryKey: ['dashboardStats', schoolId],
        queryFn: () => apiRequest<DashboardStats>('GET', '/dashboard/stats'),
        enabled: !!schoolId,
        staleTime: 0, // Always fresh for dashboard? Or 1 min?
    });
};

export const useRevenueTrends = (schoolId?: number) => {
    return useQuery({
        queryKey: ['revenueTrends', schoolId],
        queryFn: () => apiRequest<RevenueTrend[]>('GET', '/dashboard/revenue-trends'),
        enabled: !!schoolId,
    });
};

export const useUpcomingEvents = (schoolId?: number) => {
    return useQuery({
        queryKey: ['upcomingEvents', schoolId],
        queryFn: () => apiRequest<UpcomingEvent[]>('GET', '/dashboard/upcoming-events'),
        enabled: !!schoolId,
    });
};

export const useAcademicPerformance = (schoolId?: number) => {
    return useQuery({
        queryKey: ['academicPerformance', schoolId],
        queryFn: () => apiRequest<AcademicPerformance>('GET', '/dashboard/academic-performance'),
        enabled: !!schoolId,
    });
};

export const useDemographics = (schoolId?: number) => {
    return useQuery({
        queryKey: ['demographics', schoolId],
        queryFn: () => apiRequest<Demographics>('GET', '/dashboard/demographics'),
        enabled: !!schoolId,
    });
};
