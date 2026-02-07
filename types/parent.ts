// Parent Portal Type Definitions

// =====================================
// CHILD & DASHBOARD TYPES
// =====================================

export interface LatestGrade {
    term: number;
    year: number;
    aggregate: number;
    division: string;
}

export interface ChildSummary {
    id: number;
    name: string;
    photoBase64?: string;
    classLevel: string;
    stream: string;
    schoolName?: string;
    schoolId?: number;
    latestGrade: LatestGrade | null;
    feeBalance: number;
    attendanceRate: number;
}

export interface Guardian {
    name: string;
    email?: string;
    phone?: string;
    relationship?: string;
    occupation?: string;
    addresses?: string;
}

export interface SchoolInfo {
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
}

export interface Activity {
    type: 'mark' | 'payment';
    message: string;
    date: string;
    studentId: number;
}

export interface UpcomingEvent {
    id: number;
    name: string;
    startDate: string;
    endDate?: string;
    venue?: string;
    eventType?: string;
    targetAudience?: string;
}

export interface DashboardTotals {
    childrenCount: number;
    pendingFees: number;
    avgAttendance: number;
}

export interface ParentDashboardData {
    guardian: Guardian;
    children: ChildSummary[];
    totals: DashboardTotals;
    recentActivity: Activity[];
    upcomingEvents: UpcomingEvent[];
    unreadMessages: number;
    schoolInfo: SchoolInfo | null;
}

// =====================================
// FEES TYPES
// =====================================

export interface FeeSummary {
    totalDue: number;
    totalPaid: number;
    balance: number;
}

export interface Payment {
    id: number;
    term: number;
    year: number;
    feeType: string;
    description?: string;
    amountDue: number;
    amountPaid: number;
    balance: number;
    paymentDate?: string;
    paymentMethod?: string;
    receiptNumber?: string;
    status?: string;
}

export interface InvoiceItem {
    id: number;
    feeType: string;
    description?: string;
    amount: number;
}

export interface Invoice {
    id: number;
    invoiceNumber: string;
    term: number;
    year: number;
    totalAmount: number;
    amountPaid: number;
    balance: number;
    status: 'paid' | 'partial' | 'pending';
    items?: InvoiceItem[];
}

export interface Transaction {
    id: number;
    amount: number;
    type: string;
    description?: string;
    createdAt: string;
}

export interface FeeData {
    summary: FeeSummary;
    payments: Payment[];
    invoices: Invoice[];
    transactions: Transaction[];
}

// =====================================
// ATTENDANCE TYPES
// =====================================

export interface AttendanceStats {
    total: number;
    present: number;
    late: number;
    absent: number;
    rate: number;
}

export interface GateRecord {
    id: number;
    date: string;
    status: 'present' | 'late' | 'absent' | 'left_early';
    checkInTime?: string;
    checkOutTime?: string;
    checkInMethod?: string;
}

export interface ClassRecord {
    id: number;
    date: string;
    subject?: string;
    status: 'present' | 'absent';
}

export interface BoardingRecord {
    id: number;
    date: string;
    session: string;
    sessionTime?: string;
    status: 'present' | 'absent' | 'sick_bay' | 'on_leave' | 'unexcused';
}

export interface AttendanceData {
    month: string;
    gate: GateRecord[];
    class: ClassRecord[];
    boarding: BoardingRecord[];
    stats: AttendanceStats;
}

// =====================================
// PROFILE TYPES
// =====================================

export interface ParentProfile {
    name: string;
    email?: string;
    phone?: string;
    relationship?: string;
    occupation?: string;
    addresses?: string;
    workPhone?: string;
    nationalId?: string;
    username: string;
}

export interface LinkedChild {
    id: number;
    name: string;
    classLevel: string;
    stream: string;
    photoBase64?: string;
}

export interface ProfileData {
    profile: ParentProfile;
    children: LinkedChild[];
}

export interface ProfileUpdateData {
    phone?: string;
    email?: string;
    addresses?: string;
    occupation?: string;
}

export interface PasswordChangeData {
    currentPassword: string;
    newPassword: string;
}

// =====================================
// MESSAGING TYPES
// =====================================

export interface MessageParticipant {
    userId: number;
    name: string;
}

export interface Message {
    id: number;
    content: string;
    senderId: number;
    senderName: string;
    messageType?: string;
    createdAt: string;
    isEdited?: boolean;
    isDeleted?: boolean;
}

export interface LastMessage {
    content: string;
    senderId: number;
    createdAt: string;
    senderName: string;
}

export interface Conversation {
    id: number;
    subject: string;
    type: string;
    lastMessageAt: string;
    lastMessage: LastMessage | null;
    unreadCount: number;
    participants: MessageParticipant[];
}

export interface ConversationThread {
    conversation: Conversation;
    messages: Message[];
}

export interface Recipient {
    id: number;
    name: string;
    role: string;
}

// =====================================
// NOTIFICATIONS TYPES
// =====================================

export interface Notification {
    id: string;
    type: 'academic' | 'fees' | 'attendance' | 'event' | 'message';
    title: string;
    message: string;
    date: string;
    studentId?: number;
    eventType?: string;
}

// =====================================
// STUDENT DETAIL TYPES
// =====================================

export interface StudentDetail {
    id: number;
    name: string;
    indexNumber: string;
    classLevel: string;
    stream: string;
    gender: string;
    photoBase64?: string;
    dateOfBirth?: string;
    nationality?: string;
    religion?: string;
    admissionDate?: string;
    admissionNumber?: string;
    boardingStatus?: string;
    houseOrDormitory?: string;
    schoolName?: string;
    medicalInfo?: {
        bloodGroup?: string;
        allergies?: string;
        medicalConditions?: string;
    };
}

export interface AcademicRecord {
    id: number;
    term: number;
    year: number;
    type: string;
    marks: Record<string, number>;
    aggregate: number;
    division: string;
    comment?: string;
}

export interface TestScore {
    score: number;
    division: string;
    sessionName: string;
    testType: string;
    term: number;
    year: number;
    date?: string;
}

export interface StudentDetailData {
    student: StudentDetail;
    academic: {
        latest: AcademicRecord | null;
        history: AcademicRecord[];
        tests: TestScore[];
    };
}
