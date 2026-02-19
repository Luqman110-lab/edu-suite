import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dbService } from '../../../services/api';

export const useDataManagement = () => {
    const queryClient = useQueryClient();

    const importData = useMutation({
        mutationFn: (jsonContent: string) => dbService.importData(jsonContent),
        onSuccess: () => {
            queryClient.invalidateQueries();
        },
    });

    const mergeData = useMutation({
        mutationFn: ({ jsonContent, options }: { jsonContent: string, options: any }) =>
            dbService.mergeData(jsonContent, options),
        onSuccess: () => {
            queryClient.invalidateQueries();
        },
    });

    const deleteAllData = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/all-data', {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to delete data');
            }
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries();
        },
    });

    return {
        importData,
        mergeData,
        deleteAllData,
        exportData: dbService.exportData,
    };
};
