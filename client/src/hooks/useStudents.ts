import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dbService } from '../../../services/api';
import { Student } from '../../../types';

export const useStudents = (academicYear?: string) => {
    const queryClient = useQueryClient();

    // Fetch students
    const studentsQuery = useQuery({
        queryKey: ['students', academicYear],
        queryFn: () => dbService.getStudents(academicYear ? parseInt(academicYear) : undefined),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Add student
    const addStudent = useMutation({
        mutationFn: (student: Student) => dbService.addStudent(student),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['demographics'] });
        },
    });

    // Update student
    const updateStudent = useMutation({
        mutationFn: (student: Student) => dbService.updateStudent(student),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['demographics'] });
        },
    });

    // Delete student
    const deleteStudent = useMutation({
        mutationFn: (id: number) => dbService.deleteStudent(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['demographics'] });
        },
    });

    // Batch delete students
    const deleteStudents = useMutation({
        mutationFn: (ids: number[]) => dbService.deleteStudents(ids),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['demographics'] });
        },
    });

    // Batch import students
    const importStudents = useMutation({
        mutationFn: (students: Student[]) => dbService.addStudents(students),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['demographics'] });
        },
    });

    // Bulk transfer students
    const bulkTransferStudents = useMutation({
        mutationFn: (data: { studentIds: number[], targetClassLevel: string, targetStream: string }) =>
            dbService.bulkTransferStudents(data.studentIds, data.targetClassLevel, data.targetStream),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['demographics'] });
        },
    });

    // Promote students
    const promoteStudents = useMutation({
        mutationFn: (data: { studentIds: number[], targetClassLevel: string | null, targetStream: string | null }) =>
            dbService.promoteStudents(data.studentIds, data.targetClassLevel, data.targetStream),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['demographics'] });
        },
    });

    // Graduate students
    const graduateStudents = useMutation({
        mutationFn: (studentIds: number[]) => dbService.graduateStudents(studentIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['demographics'] });
        },
    });

    return {
        students: studentsQuery.data || [],
        isLoading: studentsQuery.isLoading,
        isError: studentsQuery.isError,
        error: studentsQuery.error,
        refetch: studentsQuery.refetch,
        addStudent,
        updateStudent,
        deleteStudent,
        deleteStudents,
        importStudents,
        bulkTransferStudents,
        promoteStudents,
        graduateStudents
    };
};
