export interface AttendanceTeacher {
    id: number;
    name: string;
    initials?: string;
    phone?: string;
    email?: string;
    classAssigned?: string;
    subjectsAssigned?: string[];
    photoUrl?: string;
}

export interface TeacherRecord {
    id: number;
    teacherId: number;
    date: string;
    checkInTime?: string;
    checkOutTime?: string;
    checkInMethod?: string;
    checkOutMethod?: string;
    status: string;
    leaveType?: string;
    notes?: string;
}

export interface AttendanceSettings {
    schoolStartTime: string;
    lateThresholdMinutes: number;
    schoolEndTime: string;
    enableFaceRecognition?: boolean;
    requireFaceForTeachers?: boolean;
    faceConfidenceThreshold?: number;
    enableGeofencing?: boolean;
    schoolLatitude?: number;
    schoolLongitude?: number;
    geofenceRadiusMeters?: number;
}

export interface FaceEmbedding {
    id: number;
    personId: number;
    personType: string;
    embedding: number[];
}

export interface TeacherStatus {
    status: string;
    record: TeacherRecord | null;
}

export interface AttendanceStats {
    total: number;
    present: number;
    late: number;
    absent: number;
    onLeave: number;
}
