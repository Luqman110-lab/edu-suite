import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dbService } from '../../../services/api';
import { Teacher } from '../../../types';

export const useTeachers = () => {
    const queryClient = useQueryClient();

    // Fetch teachers
    const teachersQuery = useQuery({
        queryKey: ['teachers'],
        queryFn: () => dbService.getTeachers(),
    });

    // Add teacher
    const addTeacher = useMutation({
        mutationFn: (teacher: Teacher) => dbService.addTeacher(teacher),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teachers'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });

    // Update teacher
    const updateTeacher = useMutation({
        mutationFn: (teacher: Teacher) => dbService.updateTeacher(teacher),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teachers'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });

    // Delete teacher
    const deleteTeacher = useMutation({
        mutationFn: (id: number) => dbService.deleteTeacher(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teachers'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });

    // Batch import teachers
    const importTeachers = useMutation({
        mutationFn: (teachers: Teacher[]) => dbService.addTeachers(teachers),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teachers'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });

    // Batch delete teachers
    const deleteTeachers = useMutation({
        mutationFn: (ids: number[]) => {
            // Sequential delete as api might not support batch delete yet?
            // apiService (dbService) does NOT have deleteTeachers(ids).
            // It has deleteTeacher(id).
            // So we must loop.
            return Promise.all(ids.map(id => dbService.deleteTeacher(id)));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teachers'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });

    return {
        teachers: teachersQuery.data || [],
        isLoading: teachersQuery.isLoading,
        isError: teachersQuery.isError,
        error: teachersQuery.error,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        deleteTeachers,
        importTeachers,
    };
};
