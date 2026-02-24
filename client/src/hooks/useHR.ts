import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { StaffLeave, DutyRoster, TeacherContract, TeacherDocument, StaffAttendance, TeacherAppraisal, TeacherDisciplinaryRecord } from "../../../types";
import { apiRequest } from "../../../services/api";

export function useStaffLeave(teacherId?: number) {
    const queryClient = useQueryClient();

    const query = useQuery<StaffLeave[]>({
        queryKey: teacherId ? ["/api/hr/leave", teacherId] : ["/api/hr/leave"],
        queryFn: async () => {
            const url = teacherId ? `/hr/leave?teacherId=${teacherId}` : "/hr/leave";
            return apiRequest<StaffLeave[]>("GET", url);
        }
    });

    const createRequestMutation = useMutation({
        mutationFn: async (data: Partial<StaffLeave>) => {
            return apiRequest<StaffLeave>("POST", "/hr/leave", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hr/leave"] });
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: number; status: 'Approved' | 'Rejected' }) => {
            return apiRequest<StaffLeave>("PATCH", `/hr/leave/${id}/status`, { status });
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
            const url = teacherId ? `/hr/duty-roster?teacherId=${teacherId}` : "/hr/duty-roster";
            return apiRequest<DutyRoster[]>("GET", url);
        }
    });

    const createDutyMutation = useMutation({
        mutationFn: async (data: Partial<DutyRoster>) => {
            return apiRequest<DutyRoster>("POST", "/hr/duty-roster", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hr/duty-roster"] });
        }
    });

    const deleteDutyMutation = useMutation({
        mutationFn: async (id: number) => {
            return apiRequest<void>("DELETE", `/hr/duty-roster/${id}`);
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
            return apiRequest<TeacherContract>("POST", "/hr/contracts", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hr/contracts"] });
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: number; status: 'Active' | 'Expired' | 'Terminated' }) => {
            return apiRequest<TeacherContract>("PATCH", `/hr/contracts/${id}/status`, { status });
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
            const url = teacherId ? `/hr/documents?teacherId=${teacherId}` : "/hr/documents";
            return apiRequest<TeacherDocument[]>("GET", url);
        }
    });

    const createDocumentMutation = useMutation({
        mutationFn: async (data: Partial<TeacherDocument>) => {
            return apiRequest<TeacherDocument>("POST", "/hr/documents", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hr/documents"] });
        }
    });

    const deleteDocumentMutation = useMutation({
        mutationFn: async (id: number) => {
            return apiRequest<void>("DELETE", `/hr/documents/${id}`);
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
            return apiRequest<StaffAttendance[]>("GET", `/hr/attendance?date=${date}`);
        }
    });

    const recordAttendanceMutation = useMutation({
        mutationFn: async (data: Partial<StaffAttendance>) => {
            return apiRequest<StaffAttendance>("POST", "/hr/attendance", data);
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
            let url = `/hr/attendance/teacher/${teacherId}`;
            const params = new URLSearchParams();
            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);

            const queryString = params.toString();
            if (queryString) url += `?${queryString}`;

            return apiRequest<StaffAttendance[]>("GET", url);
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
            const url = teacherId ? `/hr/appraisals/${teacherId}` : "/hr/appraisals";
            return apiRequest<TeacherAppraisal[]>("GET", url);
        },
        enabled: !!teacherId // Currently API only supports fetching by teacherId
    });

    const createAppraisalMutation = useMutation({
        mutationFn: async (data: Partial<TeacherAppraisal>) => {
            return apiRequest<TeacherAppraisal>("POST", "/hr/appraisals", data);
        },
        onSuccess: () => {
            if (teacherId) {
                queryClient.invalidateQueries({ queryKey: ["/api/hr/appraisals", teacherId] });
            }
        }
    });

    const updateAppraisalMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<TeacherAppraisal> }) => {
            return apiRequest<TeacherAppraisal>("PATCH", `/hr/appraisals/${id}`, data);
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
            const url = teacherId ? `/hr/disciplinary/${teacherId}` : "/hr/disciplinary";
            return apiRequest<TeacherDisciplinaryRecord[]>("GET", url);
        },
        enabled: !!teacherId
    });

    const createRecordMutation = useMutation({
        mutationFn: async (data: Partial<TeacherDisciplinaryRecord>) => {
            return apiRequest<TeacherDisciplinaryRecord>("POST", "/hr/disciplinary", data);
        },
        onSuccess: () => {
            if (teacherId) {
                queryClient.invalidateQueries({ queryKey: ["/api/hr/disciplinary", teacherId] });
            }
        }
    });

    const updateRecordMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<TeacherDisciplinaryRecord> }) => {
            return apiRequest<TeacherDisciplinaryRecord>("PATCH", `/hr/disciplinary/${id}`, data);
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
