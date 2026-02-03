
import { useQuery } from '@tanstack/react-query';
import { dbService } from '../services/api';
import { ClassLevel, SchoolSettings } from '../types';

export function useClassNames() {
    const { data: settings } = useQuery<SchoolSettings>({
        queryKey: ['settings'],
        queryFn: () => dbService.getSettings(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const getDisplayName = (level: string) => {
        if (!settings?.classAliases) return level;
        return settings.classAliases[level] || level;
    };

    const getAllClasses = () => {
        const levels = Object.values(ClassLevel);
        // Sort logic if needed, but Enum order is usually preserved or specific
        return levels.map(level => ({
            level,
            displayName: getDisplayName(level)
        }));
    };

    return {
        getDisplayName,
        getAllClasses,
        settings
    };
}
