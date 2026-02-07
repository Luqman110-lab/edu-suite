import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
    ParentDashboardData,
    FeeData,
    AttendanceData,
    ProfileData,
    ProfileUpdateData,
    PasswordChangeData,
    Conversation,
    ConversationThread,
    Recipient,
    Notification,
    StudentDetailData,
} from "../types/parent";

// =====================================
// API FETCH HELPERS
// =====================================

async function fetchWithCredentials<T>(url: string): Promise<T> {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || 'Request failed');
    }
    return res.json();
}

async function mutateWithCredentials<T>(
    url: string,
    method: 'POST' | 'PUT' | 'DELETE',
    body?: unknown
): Promise<T> {
    const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || 'Request failed');
    }
    return res.json();
}

// =====================================
// DASHBOARD HOOKS
// =====================================

export function useParentDashboard() {
    return useQuery<ParentDashboardData>({
        queryKey: ['parent-dashboard-stats'],
        queryFn: () => fetchWithCredentials<ParentDashboardData>('/api/parent/dashboard-stats'),
        staleTime: 30000, // 30 seconds
    });
}

// =====================================
// STUDENT DETAIL HOOKS
// =====================================

export function useStudentDetail(studentId: number | null) {
    return useQuery<StudentDetailData>({
        queryKey: ['parent-student-detail', studentId],
        queryFn: () => fetchWithCredentials<StudentDetailData>(`/api/parent/student/${studentId}`),
        enabled: !!studentId,
    });
}

// =====================================
// FEE HOOKS
// =====================================

export function useChildFees(childId: number | null) {
    return useQuery<FeeData>({
        queryKey: ['parent-student-fees', childId],
        queryFn: () => fetchWithCredentials<FeeData>(`/api/parent/student/${childId}/fees`),
        enabled: !!childId,
    });
}

// =====================================
// ATTENDANCE HOOKS
// =====================================

export function useChildAttendance(childId: number | null, month: string) {
    return useQuery<AttendanceData>({
        queryKey: ['parent-student-attendance', childId, month],
        queryFn: () =>
            fetchWithCredentials<AttendanceData>(`/api/parent/student/${childId}/attendance?month=${month}`),
        enabled: !!childId,
    });
}

// =====================================
// PROFILE HOOKS
// =====================================

export function useParentProfile() {
    const queryClient = useQueryClient();

    const query = useQuery<ProfileData>({
        queryKey: ['parent-profile'],
        queryFn: () => fetchWithCredentials<ProfileData>('/api/parent/profile'),
    });

    const updateMutation = useMutation({
        mutationFn: (data: ProfileUpdateData) =>
            mutateWithCredentials<{ message: string }>('/api/parent/profile', 'PUT', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['parent-profile'] });
        },
    });

    const passwordMutation = useMutation({
        mutationFn: (data: PasswordChangeData) =>
            mutateWithCredentials<{ message: string }>('/api/parent/change-password', 'PUT', data),
    });

    return {
        ...query,
        updateProfile: updateMutation.mutate,
        isUpdating: updateMutation.isPending,
        updateError: updateMutation.error,
        changePassword: passwordMutation.mutate,
        isChangingPassword: passwordMutation.isPending,
        passwordError: passwordMutation.error,
    };
}

// =====================================
// MESSAGING HOOKS
// =====================================

export function useParentConversations() {
    return useQuery<{ conversations: Conversation[] }>({
        queryKey: ['parent-conversations'],
        queryFn: () => fetchWithCredentials<{ conversations: Conversation[] }>('/api/parent/conversations'),
    });
}

export function useConversationMessages(conversationId: number | null) {
    return useQuery<ConversationThread>({
        queryKey: ['parent-conversation-messages', conversationId],
        queryFn: () =>
            fetchWithCredentials<ConversationThread>(`/api/parent/conversations/${conversationId}/messages`),
        enabled: !!conversationId,
        refetchInterval: 10000, // Poll every 10 seconds
    });
}

export function useSendMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { conversationId: number; content: string }) =>
            mutateWithCredentials<{ message: unknown }>(
                `/api/parent/conversations/${data.conversationId}/messages`,
                'POST',
                { content: data.content }
            ),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['parent-conversation-messages', variables.conversationId],
            });
            queryClient.invalidateQueries({ queryKey: ['parent-conversations'] });
        },
    });
}

export function useCreateConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { recipientId: number; subject: string; message: string }) =>
            mutateWithCredentials<{ conversation: Conversation }>(
                '/api/parent/conversations',
                'POST',
                data
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['parent-conversations'] });
        },
    });
}

export function useMarkConversationRead() {
    return useMutation({
        mutationFn: (conversationId: number) =>
            mutateWithCredentials<{ message: string }>(
                `/api/parent/conversations/${conversationId}/read`,
                'POST'
            ),
    });
}

export function useMessagingRecipients() {
    return useQuery<{ recipients: Recipient[] }>({
        queryKey: ['parent-messaging-recipients'],
        queryFn: () => fetchWithCredentials<{ recipients: Recipient[] }>('/api/parent/messaging-recipients'),
    });
}

// =====================================
// NOTIFICATIONS HOOKS
// =====================================

export function useParentNotifications() {
    return useQuery<{ notifications: Notification[] }>({
        queryKey: ['parent-notifications'],
        queryFn: () => fetchWithCredentials<{ notifications: Notification[] }>('/api/parent/notifications'),
    });
}

// =====================================
// SCHOOL INFO HOOKS
// =====================================

export function useSchoolInfo() {
    return useQuery<{
        school: {
            name: string;
            code?: string;
            motto?: string;
            email?: string;
            contactPhones?: string;
            addressBox?: string;
            logoBase64?: string;
            currentTerm: number;
            currentYear: number;
            nextTermBeginBoarders?: string;
            nextTermBeginDay?: string;
        } | null;
        events: Array<{
            id: number;
            name: string;
            startDate: string;
            endDate?: string;
            venue?: string;
            eventType?: string;
        }>;
    }>({
        queryKey: ['parent-school-info'],
        queryFn: () => fetchWithCredentials('/api/parent/school-info'),
    });
}

// =====================================
// USER HOOK
// =====================================

export function useCurrentUser() {
    return useQuery<{
        id: number;
        username: string;
        name: string;
        role: string;
    }>({
        queryKey: ['user'],
        queryFn: () => fetchWithCredentials('/api/user'),
    });
}
