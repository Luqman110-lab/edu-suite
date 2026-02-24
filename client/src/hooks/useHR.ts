import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { StaffLeave, DutyRoster, TeacherContract, TeacherDocument, StaffAttendance, TeacherAppraisal, TeacherDisciplinaryRecord } from "../../../types";

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

export function useTeacherContracts(teacherId?: number) {
    const queryClient = useQueryClient();

    const query = useQuery<TeacherContract[]>({
        queryKey: teacherId ? ["/api/hr/contracts", teacherId] : ["/api/hr/contracts"],
        queryFn: async () => {
            const url = teacherId ? `/api/hr/contracts?teacherId=${teacherId}` : "/api/hr/contracts";
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch contracts");
            return res.json();
        }
    });

    const createContractMutation = useMutation({
        mutationFn: async (data: Partial<TeacherContract>) => {
            const res = await fetch("/api/hr/contracts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to create contract");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hr/contracts"] });
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: number; status: 'Active' | 'Expired' | 'Terminated' }) => {
            const res = await fetch(`/api/hr/contracts/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error("Failed to update contract status");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hr/contracts"] });
        }
    });

    return {
        contracts: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        createContract: createContractMutation.mutate,
        updateStatus: updateStatusMutation.mutate,
        isCreating: createContractMutation.isPending,
        isUpdating: updateStatusMutation.isPending
    };
}


export function useTeacherDocuments(teacherId?: number) {
    const queryClient = useQueryClient();

    const query = useQuery<TeacherDocument[]>({
        queryKey: teacherId ? ["/api/hr/documents", teacherId] : ["/api/hr/documents"],
        queryFn: async () => {
            const url = teacherId ? `/api/hr/documents?teacherId=${teacherId}` : "/api/hr/documents";
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch documents");
            return res.json();
        }
    });

    const createDocumentMutation = useMutation({
        mutationFn: async (data: Partial<TeacherDocument>) => {
            const res = await fetch("/api/hr/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to upload document");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hr/documents"] });
        }
    });

    const deleteDocumentMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/hr/documents/${id}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete document");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hr/documents"] });
        }
    });

    return {
        documents: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        uploadDocument: createDocumentMutation.mutate,
        deleteDocument: deleteDocumentMutation.mutate,
        isUploading: createDocumentMutation.isPending,
        isDeleting: deleteDocumentMutation.isPending
    };
}


export function useStaffAttendance(date: string) {
    const queryClient = useQueryClient();

    const query = useQuery<StaffAttendance[]>({
        queryKey: ["/api/hr/attendance", date],
        queryFn: async () => {
            const res = await fetch(`/api/hr/attendance?date=${date}`);
            if (!res.ok) throw new Error("Failed to fetch staff attendance");
            return res.json();
        }
    });

    const recordAttendanceMutation = useMutation({
        mutationFn: async (data: Partial<StaffAttendance>) => {
            const res = await fetch("/api/hr/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to record attendance");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hr/attendance"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hr/attendance/teacher"] }); // Invalidate specific teacher views too
        }
    });

    return {
        attendance: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        recordAttendance: recordAttendanceMutation.mutate,
        isRecording: recordAttendanceMutation.isPending
    };
}

export function useTeacherAttendance(teacherId: number, startDate?: string, endDate?: string) {
    const query = useQuery<StaffAttendance[]>({
        queryKey: ["/api/hr/attendance/teacher", teacherId, startDate, endDate],
        queryFn: async () => {
            let url = `/api/hr/attendance/teacher/${teacherId}`;
            const params = new URLSearchParams();
            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);

            const queryString = params.toString();
            if (queryString) url += `?${queryString}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch teacher attendance history");
            return res.json();
        },
        enabled: !!teacherId // Only run if we actually have an ID
    });

    return {
        attendanceHistory: query.data || [],
        isLoading: query.isLoading,
        error: query.error
    };
}

export function useTeacherAppraisals(teacherId?: number) {
    const queryClient = useQueryClient();

    const query = useQuery<TeacherAppraisal[]>({
        queryKey: teacherId ? ["/api/hr/appraisals", teacherId] : ["/api/hr/appraisals"],
        queryFn: async () => {
            const url = teacherId ? `/api/hr/appraisals/${teacherId}` : "/api/hr/appraisals";
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch appraisals");
            return res.json();
        },
        enabled: !!teacherId // Currently API only supports fetching by teacherId
    });

    const createAppraisalMutation = useMutation({
        mutationFn: async (data: Partial<TeacherAppraisal>) => {
            const res = await fetch("/api/hr/appraisals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to create appraisal");
            return res.json();
        },
        onSuccess: () => {
            if (teacherId) {
                queryClient.invalidateQueries({ queryKey: ["/api/hr/appraisals", teacherId] });
            }
        }
    });

    const updateAppraisalMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<TeacherAppraisal> }) => {
            const res = await fetch(`/api/hr/appraisals/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to update appraisal");
            return res.json();
        },
        onSuccess: () => {
            if (teacherId) {
                queryClient.invalidateQueries({ queryKey: ["/api/hr/appraisals", teacherId] });
            }
        }
    });

    return {
        appraisals: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        createAppraisal: createAppraisalMutation.mutate,
        updateAppraisal: updateAppraisalMutation.mutate,
        isCreating: createAppraisalMutation.isPending,
        isUpdating: updateAppraisalMutation.isPending
    };
}

export function useTeacherDisciplinaryRecords(teacherId?: number) {
    const queryClient = useQueryClient();

    const query = useQuery<TeacherDisciplinaryRecord[]>({
        queryKey: teacherId ? ["/api/hr/disciplinary", teacherId] : ["/api/hr/disciplinary"],
        queryFn: async () => {
            const url = teacherId ? `/api/hr/disciplinary/${teacherId}` : "/api/hr/disciplinary";
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch disciplinary records");
            return res.json();
        },
        enabled: !!teacherId
    });

    const createRecordMutation = useMutation({
        mutationFn: async (data: Partial<TeacherDisciplinaryRecord>) => {
            const res = await fetch("/api/hr/disciplinary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to create disciplinary record");
            return res.json();
        },
        onSuccess: () => {
            if (teacherId) {
                queryClient.invalidateQueries({ queryKey: ["/api/hr/disciplinary", teacherId] });
            }
        }
    });

    const updateRecordMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<TeacherDisciplinaryRecord> }) => {
            const res = await fetch(`/api/hr/disciplinary/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to update disciplinary record");
            return res.json();
        },
        onSuccess: () => {
            if (teacherId) {
                queryClient.invalidateQueries({ queryKey: ["/api/hr/disciplinary", teacherId] });
            }
        }
    });

    return {
        records: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        createRecord: createRecordMutation.mutate,
        updateRecord: updateRecordMutation.mutate,
        isCreating: createRecordMutation.isPending,
        isUpdating: updateRecordMutation.isPending
    };
}
