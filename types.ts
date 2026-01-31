export interface School {
  id: number;
  name: string;
  code: string;
  addressBox?: string;
  contactPhones?: string;
  email?: string;
  motto?: string;
  regNumber?: string;
  centreNumber?: string;
  logoBase64?: string;
  primaryColor?: string;
  secondaryColor?: string;
  currentTerm?: number;
  currentYear?: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface UserSchool {
  id: number;
  name: string;
  code: string;
  role: string;
  isPrimary: boolean;
}

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  isSuperAdmin?: boolean;
  activeSchoolId?: number;
  activeSchoolRole?: string;
  schools?: UserSchool[];
}

export enum ClassLevel {
  P1 = 'P1', P2 = 'P2', P3 = 'P3',
  P4 = 'P4', P5 = 'P5', P6 = 'P6', P7 = 'P7'
}

// Stream enum removed to allow dynamic naming
export enum Gender {
  Male = 'M',
  Female = 'F'
}

export enum AssessmentType {
  BOT = 'BOT', // Beginning of Term
  EOT = 'EOT'  // End of Term
}

export interface SpecialCases {
  absenteeism: boolean;
  sickness: boolean;
  fees: boolean;
}

export interface MedicalInfo {
  bloodGroup?: string;
  allergies?: string;
  medicalConditions?: string;
  doctorName?: string;
  doctorPhone?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  address?: string;
}

export interface Student {
  id?: number;
  indexNumber: string;
  name: string;
  classLevel: ClassLevel;
  stream: string;
  gender: Gender;
  paycode?: string;
  parentName?: string;
  parentContact?: string;
  dateOfBirth?: string;
  nationality?: string;
  religion?: string;
  photoBase64?: string;
  admissionDate?: string;
  admissionNumber?: string;
  previousSchool?: string;
  boardingStatus?: 'day' | 'boarding';
  houseOrDormitory?: string;
  medicalInfo?: MedicalInfo;
  emergencyContacts?: EmergencyContact[];
  specialCases: SpecialCases;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Guardian {
  id?: number;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  occupation?: string;
  addressBox?: string;
  addressPhysical?: string;
  workPhone?: string;
  nationalId?: string;
  isPrimary?: boolean;
}

export interface Teacher {
  id?: number;
  employeeId?: string;
  name: string;
  gender: Gender;
  phone: string;
  email: string;
  roles: string[]; // 'Class Teacher' | 'Subject Teacher' | 'Headteacher' | 'DOS'
  assignedClass?: ClassLevel;
  assignedStream?: string; // Changed from enum to string
  subjects: string[];
  teachingClasses: ClassLevel[];
  qualifications?: string;
  dateJoined?: string;
  initials?: string;
  isActive?: boolean;
  photoBase64?: string;
}

export interface SubjectMarks {
  english?: number;
  maths?: number;
  science?: number; // P4-P7
  sst?: number;     // P4-P7
  literacy1?: number; // P1-P3
  literacy2?: number; // P1-P3
}

export interface MarkRecord {
  id?: number;
  studentId: number;
  term: number;
  year: number;
  type: AssessmentType;
  marks: SubjectMarks;
  aggregate: number;
  division: string;
  comment?: string;
  status?: string;
}

export interface GradeConfig {
  grade: string;
  minScore: number;
  maxScore: number;
  points: number;
}

export interface DivisionConfig {
  division: string;
  minAggregate: number;
  maxAggregate: number;
}

export interface GradingConfig {
  grades: GradeConfig[];
  divisions: DivisionConfig[];
  passingMark: number;
}

export interface SubjectConfig {
  lowerPrimary: string[];
  upperPrimary: string[];
}

export interface ReportConfig {
  headteacherName: string;
  headteacherTitle: string;
  showClassTeacherSignature: boolean;
  showHeadteacherSignature: boolean;
  showParentSignature: boolean;
  commentTemplates: string[];
}

export interface SecurityConfig {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  passwordExpiryDays: number;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  require2FA: boolean;
  allowedIPAddresses: string[];
  enforceIPWhitelist: boolean;
}

export interface IDCardConfig {
  showBloodGroup: boolean;
  showDob: boolean;
  showEmergencyContact: boolean;
  customTerms: string[];
  layout: 'single' | 'grid';
}

export interface SchoolSettings {
  id?: string;
  schoolName: string;
  addressBox: string;
  contactPhones: string;
  motto: string;
  regNumber: string;
  centreNumber: string;
  logoBase64?: string;
  currentTerm: number;
  currentYear: number;
  nextTermBeginBoarders: string;
  nextTermBeginDay: string;
  streams: { [key: string]: string[] };
  gradingConfig?: GradingConfig;
  subjectConfig?: SubjectConfig;
  reportConfig?: ReportConfig;
  securityConfig?: SecurityConfig;
  primaryColor?: string;
  secondaryColor?: string;
  idCardConfig?: IDCardConfig;
}

export interface FeePayment {
  id?: number;
  studentId: number;
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
  receivedBy?: string;
  status?: 'pending' | 'partial' | 'paid';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentFeeOverride {
  id?: number;
  studentId: number;
  feeType: string;
  customAmount: number;
  term?: number;
  year: number;
  reason?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeeStructure {
  id?: number;
  classLevel: string;
  feeType: string;
  amount: number;
  term?: number;
  year?: number;
  boardingStatus?: string;
  description?: string;
  isActive?: boolean;
}

export const SUBJECTS_LOWER = ['english', 'maths', 'literacy1', 'literacy2'];
export const SUBJECTS_UPPER = ['english', 'maths', 'science', 'sst'];
export const ALL_SUBJECTS = [...new Set([...SUBJECTS_LOWER, ...SUBJECTS_UPPER])];

export interface BoardingSettings {
  id?: number;
  schoolId: number;
  morningRollCallTime: string; // "06:30"
  eveningRollCallTime: string; // "20:00"
  nightRollCallTime: string;   // "22:00"
  enableMorningRollCall: boolean;
  enableEveningRollCall: boolean;
  enableNightRollCall: boolean;
  visitingDays: string[]; // ["Sunday"]
  visitingHoursStart: string; // "14:00"
  visitingHoursEnd: string;   // "17:00"
  requireGuardianApproval: boolean;
  autoMarkAbsentAfterMinutes: number;
  createdAt?: string;
  updatedAt?: string;
}
