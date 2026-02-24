import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useClassStats(classLevel: string, stream: string, term: number, year: number) {
    return useQuery({
        queryKey: ["/api/classes", classLevel, stream, "stats", term, year],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/classes/${classLevel}/${stream}/stats?term=${term}&year=${year}`);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to fetch class statistics");
            }
            return res.json();
        },
        enabled: !!classLevel && !!stream && !!term && !!year
    });
}
