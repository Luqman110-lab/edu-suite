import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { StaffLeave, DutyRoster } from "../../../types";

export function useStaffLeave(teacherId?: number) {
    const queryClient = useQueryClient();

    const query = useQuery<StaffLeave[]>({
        queryKey: teacherId ? ["/api/hr/leave", teacherId] : ["/api/hr/leave"],
        queryFn: async () => {
            const url = teacherId ? `/api/hr/leave?teacherId=${teacherId}` : "/api/hr/leave";
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch leave requests");
            return res.json();
        }
    });

    const createRequestMutation = useMutation({
        mutationFn: async (data: Partial<StaffLeave>) => {
            const res = await fetch("/api/hr/leave", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to create leave request");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hr/leave"] });
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: number; status: 'Approved' | 'Rejected' }) => {
            const res = await fetch(`/api/hr/leave/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error("Failed to update leave status");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hr/leave"] });
        }
    });

    return {
        leaves: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        createRequest: createRequestMutation.mutate,
        updateStatus: updateStatusMutation.mutate,
        isCreating: createRequestMutation.isPending,
        isUpdating: updateStatusMutation.isPending
    };
}

export function useDutyRoster(teacherId?: number) {
    const queryClient = useQueryClient();

    const query = useQuery<DutyRoster[]>({
        queryKey: teacherId ? ["/api/hr/duty-roster", teacherId] : ["/api/hr/duty-roster"],
        queryFn: async () => {
            const url = teacherId ? `/api/hr/duty-roster?teacherId=${teacherId}` : "/api/hr/duty-roster";
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch duty rosters");
            return res.json();
        }
    });

    const createDutyMutation = useMutation({
        mutationFn: async (data: Partial<DutyRoster>) => {
            const res = await fetch("/api/hr/duty-roster", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to assign duty");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hr/duty-roster"] });
        }
    });

    const deleteDutyMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/hr/duty-roster/${id}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete duty assignment");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hr/duty-roster"] });
        }
    });

    return {
        duties: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        assignDuty: createDutyMutation.mutate,
        deleteDuty: deleteDutyMutation.mutate,
        isAssigning: createDutyMutation.isPending,
        isDeleting: deleteDutyMutation.isPending
    };
}
