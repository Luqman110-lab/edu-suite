import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dbService } from '../../../services/api';
import { MarkRecord } from '../../../types';

export const useMarks = (year?: number) => {
    const queryClient = useQueryClient();

    // Fetch marks
    const marksQuery = useQuery({
        queryKey: ['marks', year],
        queryFn: () => dbService.getMarks(year),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Save single mark
    const saveMark = useMutation({
        mutationFn: (mark: Omit<MarkRecord, 'id'>) => dbService.saveMark(mark),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marks'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });

    // Save batch marks
    const saveMarks = useMutation({
        mutationFn: (marks: Omit<MarkRecord, 'id'>[]) => dbService.saveMarks(marks),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marks'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });

    // Delete marks (batch by criteria)
    const deleteMarks = useMutation({
        mutationFn: ({ studentIds, term, year, type }: { studentIds: number[]; term: number; year: number; type: string }) =>
            dbService.deleteMarks(studentIds, term, year, type),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marks'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });

    return {
        marks: marksQuery.data,
        isLoading: marksQuery.isLoading,
        isError: marksQuery.isError,
        error: marksQuery.error,
        refetch: marksQuery.refetch,
        saveMark,
        saveMarks,
        deleteMarks,
    };
};
