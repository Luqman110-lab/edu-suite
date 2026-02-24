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

export type User = AuthUser;

export enum ClassLevel {
  N1 = 'N1', N2 = 'N2', N3 = 'N3',
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
  indexNumber?: string;
  name: string;
  classLevel: string;
  stream: string;
  gender: string;
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
  boardingStatus?: string;
  houseOrDormitory?: string;
  medicalInfo?: MedicalInfo;
  emergencyContacts?: EmergencyContact[];
  specialCases?: SpecialCases;
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
  gender: string;
  phone: string;
  email: string;
  roles: string[];
  assignedClass?: string;
  assignedStream?: string;
  subjects: string[];
  teachingClasses: string[];
  qualifications?: string;
  dateJoined?: string;
  initials?: string;
  isActive?: boolean;
  photoBase64?: string;

  // HR & Compliance Fields Phase 1
  dateOfBirth?: string;
  nationalId?: string;
  religion?: string;
  maritalStatus?: string;
  homeAddress?: string;
  districtOfOrigin?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  teachingRegNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  nssfNumber?: string;
  tinNumber?: string;
  specialization?: string;
  educationHistory?: any[];
  photoUrl?: string;
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
  type: string;
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
  schoolName?: string;
  addressBox?: string;
  contactPhones?: string;
  motto?: string;
  regNumber?: string;
  centreNumber?: string;
  logoBase64?: string;
  currentTerm: number;
  currentYear: number;
  nextTermBeginBoarders?: string;
  nextTermBeginDay?: string;
  streams: { [key: string]: string[] };
  classAliases?: { [key: string]: string };
  gradingConfig?: GradingConfig;
  subjectConfig?: SubjectConfig;
  reportConfig?: ReportConfig;
  securityConfig?: SecurityConfig;
  primaryColor?: string;
  secondaryColor?: string;
  idCardConfig?: IDCardConfig;
}

export interface ActivityLog {
  id: number;
  userId?: number;
  userName?: string;
  action: string;
  entityType?: string;
  entityId?: number;
  entityName?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
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

// ==================== PLANNING & PROGRAMMING ====================

export interface TermPlan {
  id: number;
  schoolId?: number;
  name: string;
  term: number;
  year: number;
  startDate: string;
  endDate: string;
  theme?: string;
  objectives: string[];
  keyActivities: { week: number; activity: string; responsible?: string }[];
  status: string;
}

export interface EventCommittee {
  id: number;
  eventId: number;
  userId: number;
  role: string;
  responsibilities?: string;
}

export interface EventTask {
  id: number;
  eventId: number;
  title: string;
  description?: string;
  assignedToId?: number;
  dueDate?: string;
  priority: string;
  status: string;
}

export interface ProgramItem {
  id: number;
  eventId: number;
  title: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  responsiblePerson?: string;
  description?: string;
  sortOrder: number;
}

export interface SchoolEvent {
  id: number;
  termPlanId?: number;
  name: string;
  eventType: string;
  description?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  targetAudience?: string;
  targetClasses?: string[];
  budget?: number;
  status: string;
  notes?: string;
  coordinatorId?: number;
  committees?: EventCommittee[];
  tasks?: EventTask[];
  programItems?: ProgramItem[];
}

export interface TimetablePeriod {
  id: number;
  name: string;
  periodType: string;
  startTime: string;
  endTime: string;
  duration?: number;
  sortOrder: number;
  isActive: boolean;
}

export interface ClassTimetable {
  id: number;
  periodId: number;
  classLevel: string;
  stream?: string;
  dayOfWeek: string;
  subject?: string;
  teacherId?: number;
  room?: string;
}

export interface RoutineSlot {
  id?: number;
  activity: string;
  customActivity?: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface SchoolRoutine {
  id: number;
  name: string;
  description?: string;
  appliesTo: string;
  dayOfWeek: string[];
  isDefault: boolean;
  isActive: boolean;
  slots?: RoutineSlot[];
}


export interface P7ExamSet {
  id?: number;
  setNumber: number;
  name: string;
  stream?: string;
  term: number;
  year: number;
  examDate?: string;
  maxMarks: { english?: number; maths?: number; science?: number; sst?: number };
  isActive: boolean;
}

export interface P7Score {
  id?: number;
  examSetId: number;
  studentId: number;
  marks: SubjectMarks;
  total: number;
  aggregate: number;
  division: string;
  position?: number;
  comment?: string;
  status?: string;
}

export interface TestSession {
  id?: number;
  schoolId?: number;
  name: string;
  testType: string;
  classLevel: string;
  stream?: string;
  term: number;
  year: number;
  testDate?: string;
  maxMarks: {
    english?: number;
    maths?: number;
    science?: number;
    sst?: number;
    literacy1?: number;
    literacy2?: number;
  };
  isActive?: boolean;
  createdAt?: string;
}

export interface TestScore {
  id?: number;
  schoolId?: number;
  testSessionId: number;
  studentId: number;
  rawMarks: {
    english?: number;
    maths?: number;
    science?: number;
    sst?: number;
    literacy1?: number;
    literacy2?: number;
  };
  convertedMarks: {
    english?: number;
    maths?: number;
    science?: number;
    sst?: number;
    literacy1?: number;
    literacy2?: number;
  };
  aggregate?: number;
  division?: string;
}

export interface StaffLeave {
  id?: number;
  schoolId?: number;
  teacherId: number;
  leaveType: 'Sick' | 'Maternity' | 'Paternity' | 'Annual' | 'Casual' | 'Other';
  startDate: string;
  endDate: string;
  status?: 'Pending' | 'Approved' | 'Rejected';
  reason: string;
  approvedBy?: number;
  createdAt?: string;
}

export interface DutyRoster {
  id?: number;
  schoolId?: number;
  teacherId: number;
  dutyType: 'Teacher on Duty' | 'Prep Supervision' | 'Break Duty' | 'Exam Invigilation' | 'Other';
  startDate: string;
  endDate: string;
  notes?: string;
  createdAt?: string;
}

export interface TeacherContract {
  id?: number;
  schoolId?: number;
  teacherId: number;
  contractType: 'Full-time' | 'Part-time' | 'Contract' | 'Temporary' | 'Other';
  startDate: string;
  endDate?: string;
  baseSalary?: number;
  status: 'Active' | 'Expired' | 'Terminated';
  documentUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherDocument {
  id?: number;
  schoolId?: number;
  teacherId: number;
  documentType: 'CV' | 'National ID' | 'Academic Certificate' | 'Teaching License' | 'Other';
  title: string;
  fileUrl: string;
  uploadedAt?: string;
}
