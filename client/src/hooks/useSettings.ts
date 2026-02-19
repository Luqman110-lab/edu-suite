import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dbService } from '../../../services/api';
import { SchoolSettings } from '../../../types';

export const useSettings = () => {
    const queryClient = useQueryClient();

    // Fetch settings
    const settingsQuery = useQuery({
        queryKey: ['settings'],
        queryFn: () => dbService.getSettings(),
        staleTime: 1000 * 60 * 30, // 30 minutes
    });

    // Update settings
    const updateSettings = useMutation({
        mutationFn: (settings: SchoolSettings) => dbService.saveSettings(settings),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
    });

    return {
        settings: settingsQuery.data,
        isLoading: settingsQuery.isLoading,
        isError: settingsQuery.isError,
        error: settingsQuery.error,
        refetch: settingsQuery.refetch,
        updateSettings,
    };
};
