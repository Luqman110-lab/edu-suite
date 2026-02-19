
export interface GateStudent {
    id: number;
    name: string;
    classLevel: string;
    stream?: string;
    indexNumber?: string;
    photoUrl?: string;
    boardingStatus?: string;
}

export interface GateRecord {
    id: number;
    studentId: number;
    date: string;
    checkInTime?: string;
    checkOutTime?: string;
    checkInMethod?: string;
    checkOutMethod?: string;
    status: string;
}

export interface GateSettings {
    schoolStartTime: string;
    lateThresholdMinutes: number;
    gateCloseTime: string;
    schoolEndTime: string;
    enableFaceRecognition: boolean;
    enableQrScanning: boolean;
    requireFaceForGate?: boolean;
    faceConfidenceThreshold?: number;
}

export interface GateStats {
    total: number;
    present: number;
    late: number;
    absent: number;
    leftEarly: number;
}

export interface StudentStatus {
    status: string;
    record: GateRecord | null;
}
