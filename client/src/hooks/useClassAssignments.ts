import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// --- Types ---
export interface TeacherAssignment {
    id: number;
    schoolId: number;
    teacherId: number;
    classLevel: string;
    stream: string | null;
    subject: string | null;
    role: 'class_teacher' | 'subject_teacher';
    term: number;
    year: number;
    isActive: boolean;
}

export interface AssignmentWithTeacher {
    assignment: TeacherAssignment;
    teacher: {
        id: number;
        name: string;
    } | null;
}

export interface ClassStream {
    id: number;
    schoolId: number;
    classLevel: string;
    streamName: string;
    maxCapacity: number;
    isActive: boolean;
    sortOrder: number;
}

export function useClassAssignments(term: number, year: number) {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const queryKey = ["/api/class-assignments", term, year];

    const { data: assignments = [], isLoading } = useQuery<AssignmentWithTeacher[]>({
        queryKey,
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/class-assignments?term=${term}&year=${year}`);
            if (!res.ok) throw new Error("Failed to fetch assignments");
            return res.json();
        }
    });

    const assignClassTeacherMutation = useMutation({
        mutationFn: async (data: { teacherId: number; classLevel: string; stream: string }) => {
            const res = await apiRequest("POST", "/api/class-assignments", { ...data, term, year });
            if (!res.ok) throw new Error("Failed to assign class teacher");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast({
                title: "Success",
                description: "Class teacher assigned successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    const assignSubjectTeacherMutation = useMutation({
        mutationFn: async (data: { teacherId: number; classLevel: string; stream: string; subject: string }) => {
            const res = await apiRequest("POST", "/api/class-assignments/subject", { ...data, term, year });
            if (!res.ok) throw new Error("Failed to assign subject teacher");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast({
                title: "Success",
                description: "Subject teacher assigned successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    const removeAssignmentMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest("DELETE", `/api/class-assignments/${id}`);
            if (!res.ok) throw new Error("Failed to remove assignment");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast({
                title: "Success",
                description: "Assignment removed successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    return {
        assignments,
        isLoading,
        assignClassTeacher: assignClassTeacherMutation.mutateAsync,
        isAssigning: assignClassTeacherMutation.isPending,
        assignSubjectTeacher: assignSubjectTeacherMutation.mutateAsync,
        isAssigningSubject: assignSubjectTeacherMutation.isPending,
        removeAssignment: removeAssignmentMutation.mutateAsync,
        isRemoving: removeAssignmentMutation.isPending,
    };
}

export function useStreams() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const queryKey = ["/api/streams"];

    const { data: streams = [], isLoading } = useQuery<ClassStream[]>({
        queryKey,
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/streams");
            if (!res.ok) throw new Error("Failed to fetch streams");
            return res.json();
        }
    });

    const createStreamMutation = useMutation({
        mutationFn: async (data: { classLevel: string; streamName: string; maxCapacity?: number }) => {
            const res = await apiRequest("POST", "/api/streams", data);
            if (!res.ok) throw new Error("Failed to create stream");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast({
                title: "Success",
                description: "Stream created successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    const updateStreamMutation = useMutation({
        mutationFn: async (data: { id: number; maxCapacity: number }) => {
            const res = await apiRequest("PUT", `/api/streams/${data.id}`, { maxCapacity: data.maxCapacity });
            if (!res.ok) throw new Error("Failed to update stream");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast({
                title: "Success",
                description: "Stream updated successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    const removeStreamMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest("DELETE", `/api/streams/${id}`);
            if (!res.ok) throw new Error("Failed to remove stream");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast({
                title: "Success",
                description: "Stream removed successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    return {
        streams,
        isLoading,
        createStream: createStreamMutation.mutateAsync,
        isCreating: createStreamMutation.isPending,
        updateStream: updateStreamMutation.mutateAsync,
        isUpdating: updateStreamMutation.isPending,
        removeStream: removeStreamMutation.mutateAsync,
        isRemoving: removeStreamMutation.isPending,
    };
}
