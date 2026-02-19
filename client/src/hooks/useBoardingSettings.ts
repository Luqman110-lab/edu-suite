import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dbService } from '../../../services/api';
import { BoardingSettings } from '../../../types';

export const useBoardingSettings = () => {
    const queryClient = useQueryClient();

    // Fetch settings
    const settingsQuery = useQuery({
        queryKey: ['boardingSettings'],
        queryFn: () => dbService.getBoardingSettings(),
        staleTime: 1000 * 60 * 30, // 30 minutes
    });

    // Update settings
    const updateSettings = useMutation({
        mutationFn: (settings: BoardingSettings) => dbService.updateBoardingSettings(settings),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['boardingSettings'] });
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
