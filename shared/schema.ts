import { pgTable, text, serial, integer, boolean, json, timestamp, unique, index, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").unique().notNull(),
  addressBox: text("address_box").default(""),
  contactPhones: text("contact_phones").default(""),
  email: text("email"),
  motto: text("motto").default(""),
  regNumber: text("reg_number").default(""),
  centreNumber: text("centre_number").default(""),
  logoBase64: text("logo_base64"),
  primaryColor: text("primary_color").default("#7B1113"),
  secondaryColor: text("secondary_color").default("#1E3A5F"),
  currentTerm: integer("current_term").default(1),
  currentYear: integer("current_year").default(2026),
  nextTermBeginBoarders: text("next_term_begin_boarders").default(""),
  nextTermBeginDay: text("next_term_begin_day").default(""),
  streams: json("streams").$type<{ [key: string]: string[] }>().default({
    N1: [],
    N2: [],
    N3: [],
    P1: [],
    P2: [],
    P3: [],
    P4: [],
    P5: [],
    P6: [],
    P7: [],
  }),
  classAliases: json("class_aliases").$type<{ [key: string]: string }>().default({}),
  gradingConfig: json("grading_config").$type<{
    grades: { grade: string; minScore: number; maxScore: number; points: number }[];
    divisions: { division: string; minAggregate: number; maxAggregate: number }[];
    passingMark: number;
  }>().default({
    grades: [
      { grade: "D1", minScore: 90, maxScore: 100, points: 1 },
      { grade: "D2", minScore: 80, maxScore: 89, points: 2 },
      { grade: "C3", minScore: 70, maxScore: 79, points: 3 },
      { grade: "C4", minScore: 60, maxScore: 69, points: 4 },
      { grade: "C5", minScore: 55, maxScore: 59, points: 5 },
      { grade: "C6", minScore: 50, maxScore: 54, points: 6 },
      { grade: "P7", minScore: 45, maxScore: 49, points: 7 },
      { grade: "P8", minScore: 40, maxScore: 44, points: 8 },
      { grade: "F9", minScore: 0, maxScore: 39, points: 9 },
    ],
    divisions: [
      { division: "I", minAggregate: 4, maxAggregate: 12 },
      { division: "II", minAggregate: 13, maxAggregate: 24 },
      { division: "III", minAggregate: 25, maxAggregate: 28 },
      { division: "IV", minAggregate: 29, maxAggregate: 32 },
      { division: "U", minAggregate: 33, maxAggregate: 36 },
    ],
    passingMark: 40,
  }),
  subjectsConfig: json("subjects_config").$type<{
    lowerPrimary: { name: string; code: string; isCompulsory: boolean }[];
    upperPrimary: { name: string; code: string; isCompulsory: boolean }[];
  }>().default({
    lowerPrimary: [
      { name: "English", code: "english", isCompulsory: true },
      { name: "Mathematics", code: "maths", isCompulsory: true },
      { name: "Literacy 1", code: "literacy1", isCompulsory: true },
      { name: "Literacy 2", code: "literacy2", isCompulsory: true },
    ],
    upperPrimary: [
      { name: "English", code: "english", isCompulsory: true },
      { name: "Mathematics", code: "maths", isCompulsory: true },
      { name: "Science", code: "science", isCompulsory: true },
      { name: "Social Studies", code: "sst", isCompulsory: true },
    ],
  }),
  reportConfig: json("report_config").$type<{
    headteacherName: string;
    headteacherTitle: string;
    showClassTeacherSignature: boolean;
    showHeadteacherSignature: boolean;
    showParentSignature: boolean;
    commentTemplates: string[];
    conductOptions: string[];
  }>().default({
    headteacherName: "",
    headteacherTitle: "Headteacher",
    showClassTeacherSignature: true,
    showHeadteacherSignature: true,
    showParentSignature: true,
    commentTemplates: [
      "Excellent performance. Keep it up!",
      "Good work. Continue improving.",
      "Fair performance. More effort needed.",
      "Needs improvement. Work harder next term.",
      "Poor performance. Requires special attention.",
    ],
    conductOptions: ["Excellent", "Very Good", "Good", "Fair", "Needs Improvement"],
  }),
  idCardConfig: json("id_card_config").$type<{
    showBloodGroup: boolean;
    showDob: boolean;
    showEmergencyContact: boolean;
    customTerms: string[];
    layout: 'single' | 'grid';
  }>().default({
    showBloodGroup: true,
    showDob: true,
    showEmergencyContact: true,
    customTerms: [
      "Property of the school",
      "Carry at all times",
      "Report loss immediately",
      "Non-transferable"
    ],
    layout: 'single'
  }),
  securityConfig: json("security_config").$type<{
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
  }>().default({
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: false,
    passwordExpiryDays: 0,
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    require2FA: false,
    allowedIPAddresses: [],
    enforceIPWhitelist: false,
  }),
  archivedYears: json("archived_years").$type<number[]>().default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("teacher"),
  email: text("email"),
  phone: text("phone"),
  isSuperAdmin: boolean("is_super_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSchools = pgTable("user_schools", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("teacher"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userSchoolUnique: unique().on(table.userId, table.schoolId),
  userIdx: index("user_schools_user_idx").on(table.userId),
  schoolIdx: index("user_schools_school_idx").on(table.schoolId),
}));

// Audit Logs for tracking admin actions
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  userName: text("user_name"),
  action: text("action").notNull(), // 'create', 'update', 'delete', 'login', 'logout', 'switch_school'
  entityType: text("entity_type"), // 'school', 'user', 'student', 'teacher', 'fee_structure'
  entityId: integer("entity_id"),
  entityName: text("entity_name"),
  details: json("details").$type<Record<string, any>>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("audit_logs_user_idx").on(table.userId),
  actionIdx: index("audit_logs_action_idx").on(table.action),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
}));

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  indexNumber: text("index_number").notNull(),
  name: text("name").notNull(),
  classLevel: text("class_level").notNull(),
  stream: text("stream").notNull(),
  gender: text("gender").notNull(),
  paycode: text("paycode"),
  parentName: text("parent_name"),
  parentContact: text("parent_contact"),
  dateOfBirth: text("date_of_birth"),
  nationality: text("nationality").default("Ugandan"),
  religion: text("religion"),
  photoBase64: text("photo_base64"),
  admissionDate: text("admission_date"),
  admissionNumber: text("admission_number"),
  previousSchool: text("previous_school"),
  boardingStatus: text("boarding_status").default("day"),
  houseOrDormitory: text("house_or_dormitory"),
  medicalInfo: json("medical_info").$type<{
    bloodGroup?: string;
    allergies?: string;
    medicalConditions?: string;
    doctorName?: string;
    doctorPhone?: string;
  }>().default({}),
  emergencyContacts: json("emergency_contacts").$type<{
    name: string;
    relationship: string;
    phone: string;
    address?: string;
  }[]>().default([]),
  specialCases: json("special_cases").$type<{
    absenteeism: boolean;
    sickness: boolean;
    fees: boolean;
  }>().default({ absenteeism: false, sickness: false, fees: false }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("students_school_idx").on(table.schoolId),
  indexSchoolUnique: unique().on(table.indexNumber, table.schoolId),
}));

export const guardians = pgTable("guardians", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").unique().references(() => users.id, { onDelete: "set null" }),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  relationship: text("relationship").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  occupation: text("occupation"),
  addressBox: text("address_box"),
  addressPhysical: text("address_physical"),
  workPhone: text("work_phone"),
  nationalId: text("national_id"),
  isPrimary: boolean("is_primary").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("guardians_school_idx").on(table.schoolId),
}));

export const studentGuardians = pgTable("student_guardians", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  guardianId: integer("guardian_id").notNull().references(() => guardians.id, { onDelete: "cascade" }),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  studentGuardianUnique: unique().on(table.studentId, table.guardianId),
  studentIdx: index("student_guardians_student_idx").on(table.studentId),
  guardianIdx: index("student_guardians_guardian_idx").on(table.guardianId),
}));

export const promotionHistory = pgTable("promotion_history", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  fromClass: text("from_class").notNull(),
  toClass: text("to_class").notNull(),
  fromStream: text("from_stream"),
  toStream: text("to_stream"),
  academicYear: integer("academic_year").notNull(),
  term: integer("term").notNull(),
  promotedBy: integer("promoted_by").references(() => users.id),
  promotedAt: timestamp("promoted_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("promotion_history_school_idx").on(table.schoolId),
  studentIdx: index("promotion_history_student_idx").on(table.studentId),
}));

export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  employeeId: text("employee_id"),
  name: text("name").notNull(),
  gender: text("gender").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  roles: json("roles").$type<string[]>().default([]),
  assignedClass: text("assigned_class"),
  assignedStream: text("assigned_stream"),
  subjects: json("subjects").$type<string[]>().default([]),
  teachingClasses: json("teaching_classes").$type<string[]>().default([]),
  qualifications: text("qualifications"),
  dateJoined: text("date_joined"),
  initials: text("initials"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("teachers_school_idx").on(table.schoolId),
}));

export const marks = pgTable("marks", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  term: integer("term").notNull(),
  year: integer("year").notNull(),
  type: text("type").notNull(),
  marks: json("marks").$type<{
    english?: number;
    maths?: number;
    science?: number;
    sst?: number;
    literacy1?: number;
    literacy2?: number;
  }>().default({}),
  aggregate: integer("aggregate").default(0),
  division: text("division").default(""),
  comment: text("comment").default(""),
  status: text("status").default("present"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("marks_school_idx").on(table.schoolId),
  studentTermTypeUnique: unique().on(table.studentId, table.term, table.year, table.type),
}));



export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  userName: text("user_name").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("activity_logs_school_idx").on(table.schoolId),
}));

export const testSessions = pgTable("test_sessions", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  testType: text("test_type").notNull(),
  classLevel: text("class_level").notNull(),
  stream: text("stream"),
  term: integer("term").notNull(),
  year: integer("year").notNull(),
  testDate: text("test_date"),
  maxMarks: json("max_marks").$type<{
    english?: number;
    maths?: number;
    science?: number;
    sst?: number;
    literacy1?: number;
    literacy2?: number;
  }>().default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("test_sessions_school_idx").on(table.schoolId),
}));

export const testScores = pgTable("test_scores", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  testSessionId: integer("test_session_id").notNull().references(() => testSessions.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  rawMarks: json("raw_marks").$type<{
    english?: number;
    maths?: number;
    science?: number;
    sst?: number;
    literacy1?: number;
    literacy2?: number;
  }>().default({}),
  convertedMarks: json("converted_marks").$type<{
    english?: number;
    maths?: number;
    science?: number;
    sst?: number;
    literacy1?: number;
    literacy2?: number;
  }>().default({}),
  aggregate: integer("aggregate").default(0),
  division: text("division").default(""),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("test_scores_school_idx").on(table.schoolId),
  testSessionIdx: index("test_scores_session_idx").on(table.testSessionId),
  studentSessionUnique: unique().on(table.studentId, table.testSessionId),
}));

export const testSessionsRelations = relations(testSessions, ({ one, many }) => ({
  school: one(schools, {
    fields: [testSessions.schoolId],
    references: [schools.id],
  }),
  testScores: many(testScores),
}));

export const testScoresRelations = relations(testScores, ({ one }) => ({
  school: one(schools, {
    fields: [testScores.schoolId],
    references: [schools.id],
  }),
  testSession: one(testSessions, {
    fields: [testScores.testSessionId],
    references: [testSessions.id],
  }),
  student: one(students, {
    fields: [testScores.studentId],
    references: [students.id],
  }),
}));

export const schoolsRelations = relations(schools, ({ many }) => ({
  students: many(students),
  teachers: many(teachers),
  marks: many(marks),
  userSchools: many(userSchools),
  activityLogs: many(activityLogs),
  testSessions: many(testSessions),
  testScores: many(testScores),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  userSchools: many(userSchools),
  guardians: one(guardians),
}));

export const userSchoolsRelations = relations(userSchools, ({ one }) => ({
  user: one(users, {
    fields: [userSchools.userId],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [userSchools.schoolId],
    references: [schools.id],
  }),
}));

export const marksRelations = relations(marks, ({ one }) => ({
  student: one(students, {
    fields: [marks.studentId],
    references: [students.id],
  }),
  school: one(schools, {
    fields: [marks.schoolId],
    references: [schools.id],
  }),
}));

export const studentsRelations = relations(students, ({ many, one }) => ({
  marks: many(marks),
  school: one(schools, {
    fields: [students.schoolId],
    references: [schools.id],
  }),
  studentGuardians: many(studentGuardians),
}));

export const guardiansRelations = relations(guardians, ({ many, one }) => ({
  school: one(schools, {
    fields: [guardians.schoolId],
    references: [schools.id],
  }),
  studentGuardians: many(studentGuardians),
  user: one(users, {
    fields: [guardians.userId],
    references: [users.id],
  }),
}));

export const studentGuardiansRelations = relations(studentGuardians, ({ one }) => ({
  student: one(students, {
    fields: [studentGuardians.studentId],
    references: [students.id],
  }),
  guardian: one(guardians, {
    fields: [studentGuardians.guardianId],
    references: [guardians.id],
  }),
}));

export const teachersRelations = relations(teachers, ({ one }) => ({
  school: one(schools, {
    fields: [teachers.schoolId],
    references: [schools.id],
  }),
}));

export const insertSchoolSchema = createInsertSchema(schools, {
  name: z.string().min(3, "School name must be at least 3 characters"),
  code: z.string().min(2, "School code must be at least 2 characters"),
});
export const selectSchoolSchema = createSelectSchema(schools);

export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "teacher", "parent"]),
});

export const selectUserSchema = createSelectSchema(users);

export const insertUserSchoolSchema = createInsertSchema(userSchools);
export const selectUserSchoolSchema = createSelectSchema(userSchools);

export const insertStudentSchema = createInsertSchema(students);
export const selectStudentSchema = createSelectSchema(students);

export const insertGuardianSchema = createInsertSchema(guardians);
export const selectGuardianSchema = createSelectSchema(guardians);

export const insertStudentGuardianSchema = createInsertSchema(studentGuardians);
export const selectStudentGuardianSchema = createSelectSchema(studentGuardians);

export const insertPromotionHistorySchema = createInsertSchema(promotionHistory);
export const selectPromotionHistorySchema = createSelectSchema(promotionHistory);

export const insertTeacherSchema = createInsertSchema(teachers);
export const selectTeacherSchema = createSelectSchema(teachers);

export const insertMarkSchema = createInsertSchema(marks);
export const selectMarkSchema = createSelectSchema(marks);



export const insertActivityLogSchema = createInsertSchema(activityLogs);
export const selectActivityLogSchema = createSelectSchema(activityLogs);

export const insertTestSessionSchema = createInsertSchema(testSessions, {
  name: z.string().min(1, "Test name is required"),
  testType: z.string().min(1, "Test type is required"),
  classLevel: z.string().min(1, "Class is required"),
});
export const selectTestSessionSchema = createSelectSchema(testSessions);

export const insertTestScoreSchema = createInsertSchema(testScores);
export const selectTestScoreSchema = createSelectSchema(testScores);

export type School = typeof schools.$inferSelect;
export type InsertSchool = typeof schools.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserSchool = typeof userSchools.$inferSelect;
export type InsertUserSchool = typeof userSchools.$inferInsert;
export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;
export type Guardian = typeof guardians.$inferSelect;
export type InsertGuardian = typeof guardians.$inferInsert;
export type StudentGuardian = typeof studentGuardians.$inferSelect;
export type InsertStudentGuardian = typeof studentGuardians.$inferInsert;
export type PromotionHistory = typeof promotionHistory.$inferSelect;
export type InsertPromotionHistory = typeof promotionHistory.$inferInsert;
export type Teacher = typeof teachers.$inferSelect;
export type InsertTeacher = typeof teachers.$inferInsert;
export type Mark = typeof marks.$inferSelect;
export type InsertMark = typeof marks.$inferInsert;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
export type TestSession = typeof testSessions.$inferSelect;
export type InsertTestSession = typeof testSessions.$inferInsert;
export type TestScore = typeof testScores.$inferSelect;
export type InsertTestScore = typeof testScores.$inferInsert;

export const demoRequests = pgTable("demo_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  schoolName: text("school_name").notNull(),
  studentCount: text("student_count"),
  message: text("message"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const p7ExamSets = pgTable("p7_exam_sets", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  setNumber: integer("set_number").notNull(),
  name: text("name").notNull(),
  stream: text("stream"),
  term: integer("term").notNull(),
  year: integer("year").notNull(),
  examDate: text("exam_date"),
  maxMarks: json("max_marks").$type<{
    english?: number;
    maths?: number;
    science?: number;
    sst?: number;
  }>().default({ english: 100, maths: 100, science: 100, sst: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("p7_exam_sets_school_idx").on(table.schoolId),
  setUnique: unique().on(table.schoolId, table.setNumber, table.stream, table.term, table.year),
}));

export const p7Scores = pgTable("p7_scores", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  examSetId: integer("exam_set_id").notNull().references(() => p7ExamSets.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  marks: json("marks").$type<{
    english?: number;
    maths?: number;
    science?: number;
    sst?: number;
  }>().default({}),
  total: integer("total").default(0),
  aggregate: integer("aggregate").default(0),
  division: text("division").default(""),
  position: integer("position"),
  comment: text("comment").default(""),
  status: text("status").default("present"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("p7_scores_school_idx").on(table.schoolId),
  examSetIdx: index("p7_scores_exam_set_idx").on(table.examSetId),
  studentSetUnique: unique().on(table.studentId, table.examSetId),
}));

export const p7ExamSetsRelations = relations(p7ExamSets, ({ one, many }) => ({
  school: one(schools, {
    fields: [p7ExamSets.schoolId],
    references: [schools.id],
  }),
  scores: many(p7Scores),
}));

export const p7ScoresRelations = relations(p7Scores, ({ one }) => ({
  school: one(schools, {
    fields: [p7Scores.schoolId],
    references: [schools.id],
  }),
  examSet: one(p7ExamSets, {
    fields: [p7Scores.examSetId],
    references: [p7ExamSets.id],
  }),
  student: one(students, {
    fields: [p7Scores.studentId],
    references: [students.id],
  }),
}));

export const feePayments = pgTable("fee_payments", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  term: integer("term").notNull(),
  year: integer("year").notNull(),
  feeType: text("fee_type").notNull(),
  description: text("description"),
  amountDue: integer("amount_due").notNull(),
  amountPaid: integer("amount_paid").notNull().default(0),
  balance: integer("balance").notNull().default(0),
  paymentDate: text("payment_date"),
  paymentMethod: text("payment_method"),
  receiptNumber: text("receipt_number"),
  receivedBy: text("received_by"),
  status: text("status").default("pending"),
  notes: text("notes"),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("fee_payments_school_idx").on(table.schoolId),
  studentIdx: index("fee_payments_student_idx").on(table.studentId),
}));

export const feePaymentsRelations = relations(feePayments, ({ one }) => ({
  school: one(schools, {
    fields: [feePayments.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [feePayments.studentId],
    references: [students.id],
  }),
}));

export const insertFeePaymentSchema = createInsertSchema(feePayments, {
  feeType: z.string().min(1, "Fee type is required"),
  amountDue: z.number().min(0, "Amount must be positive"),
  amountPaid: z.number().min(0, "Amount must be positive"),
});
export const selectFeePaymentSchema = createSelectSchema(feePayments);
export type FeePayment = typeof feePayments.$inferSelect;
export type InsertFeePayment = typeof feePayments.$inferInsert;

// Invoices for term-based billing
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  term: integer("term").notNull(),
  year: integer("year").notNull(),
  totalAmount: integer("total_amount").notNull().default(0),
  amountPaid: integer("amount_paid").notNull().default(0),
  balance: integer("balance").notNull().default(0),
  dueDate: text("due_date"),
  status: text("status").default("unpaid"), // unpaid, partial, paid, overdue
  notes: text("notes"),
  reminderSentAt: timestamp("reminder_sent_at"),
  reminderCount: integer("reminder_count").default(0),
  lastReminderType: text("last_reminder_type"), // 'sms', 'email'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("invoices_school_idx").on(table.schoolId),
  studentIdx: index("invoices_student_idx").on(table.studentId),
  statusIdx: index("invoices_status_idx").on(table.status),
  invoiceNumberUnique: unique().on(table.schoolId, table.invoiceNumber),
}));

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  feeType: text("fee_type").notNull(),
  description: text("description"),
  amount: integer("amount").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  invoiceIdx: index("invoice_items_invoice_idx").on(table.invoiceId),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  school: one(schools, {
    fields: [invoices.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [invoices.studentId],
    references: [students.id],
  }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const insertInvoiceSchema = createInsertSchema(invoices, {
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  term: z.number().min(1).max(3),
  year: z.number().min(2020).max(2100),
});
export const selectInvoiceSchema = createSelectSchema(invoices);
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems, {
  feeType: z.string().min(1, "Fee type is required"),
  amount: z.number().min(0, "Amount must be positive"),
});
export const selectInvoiceItemSchema = createSelectSchema(invoiceItems);
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = typeof invoiceItems.$inferInsert;

export const insertDemoRequestSchema = createInsertSchema(demoRequests);
export const selectDemoRequestSchema = createSelectSchema(demoRequests);
export type DemoRequest = typeof demoRequests.$inferSelect;
export type InsertDemoRequest = typeof demoRequests.$inferInsert;

export const insertP7ExamSetSchema = createInsertSchema(p7ExamSets, {
  name: z.string().min(1, "Set name is required"),
  setNumber: z.number().min(1).max(10),
});
export const selectP7ExamSetSchema = createSelectSchema(p7ExamSets);
export type P7ExamSet = typeof p7ExamSets.$inferSelect;
export type InsertP7ExamSet = typeof p7ExamSets.$inferInsert;

export const insertP7ScoreSchema = createInsertSchema(p7Scores);
export const selectP7ScoreSchema = createSelectSchema(p7Scores);
export type P7Score = typeof p7Scores.$inferSelect;
export type InsertP7Score = typeof p7Scores.$inferInsert;

export const feeStructures = pgTable("fee_structures", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  classLevel: text("class_level").notNull(),
  feeType: text("fee_type").notNull(),
  amount: integer("amount").notNull(),
  term: integer("term"),
  year: integer("year").notNull(),
  boardingStatus: text("boarding_status"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("fee_structures_school_idx").on(table.schoolId),
  classTermUnique: unique().on(table.schoolId, table.classLevel, table.feeType, table.term, table.year, table.boardingStatus),
}));

export const feeStructuresRelations = relations(feeStructures, ({ one }) => ({
  school: one(schools, {
    fields: [feeStructures.schoolId],
    references: [schools.id],
  }),
}));

export const insertFeeStructureSchema = createInsertSchema(feeStructures, {
  classLevel: z.string().min(1, "Class is required"),
  feeType: z.string().min(1, "Fee type is required"),
  amount: z.number().min(0, "Amount must be positive"),
});
export const selectFeeStructureSchema = createSelectSchema(feeStructures);
export type FeeStructure = typeof feeStructures.$inferSelect;
export type InsertFeeStructure = typeof feeStructures.$inferInsert;


export const financeTransactions = pgTable("finance_transactions", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  // 'debit' = charge (increases balance), 'credit' = payment (decreases balance)
  transactionType: text("transaction_type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description"),
  term: integer("term").notNull(),
  year: integer("year").notNull(),
  transactionDate: text("transaction_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("finance_transactions_school_idx").on(table.schoolId),
  studentIdx: index("finance_transactions_student_idx").on(table.studentId),
}));

export const financeTransactionsRelations = relations(financeTransactions, ({ one }) => ({
  school: one(schools, {
    fields: [financeTransactions.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [financeTransactions.studentId],
    references: [students.id],
  }),
}));

export const insertFinanceTransactionSchema = createInsertSchema(financeTransactions, {
  transactionType: z.enum(["debit", "credit"]),
  amount: z.number().min(0, "Amount must be positive"),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});
export const selectFinanceTransactionSchema = createSelectSchema(financeTransactions);
export type FinanceTransaction = typeof financeTransactions.$inferSelect;
export type InsertFinanceTransaction = typeof financeTransactions.$inferInsert;

export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#6B7280"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("expense_categories_school_idx").on(table.schoolId),
  nameUnique: unique().on(table.schoolId, table.name),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ one, many }) => ({
  school: one(schools, {
    fields: [expenseCategories.schoolId],
    references: [schools.id],
  }),
  expenses: many(expenses),
}));

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories, {
  name: z.string().min(1, "Category name is required"),
});
export const selectExpenseCategorySchema = createSelectSchema(expenseCategories);
export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type InsertExpenseCategory = typeof expenseCategories.$inferInsert;

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => expenseCategories.id, { onDelete: "set null" }),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  vendor: text("vendor"),
  referenceNumber: text("reference_number"),
  expenseDate: text("expense_date").notNull(),
  paymentMethod: text("payment_method"),
  term: integer("term"),
  year: integer("year"),
  status: text("status").default("pending"), // 'pending', 'approved', 'rejected', 'paid'
  approvedBy: integer("approved_by").references(() => users.id),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("expenses_school_idx").on(table.schoolId),
  categoryIdx: index("expenses_category_idx").on(table.categoryId),
  dateIdx: index("expenses_date_idx").on(table.expenseDate),
  statusIdx: index("expenses_status_idx").on(table.status),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  school: one(schools, {
    fields: [expenses.schoolId],
    references: [schools.id],
  }),
  category: one(expenseCategories, {
    fields: [expenses.categoryId],
    references: [expenseCategories.id],
  }),
  creator: one(users, {
    fields: [expenses.createdBy],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [expenses.approvedBy],
    references: [users.id],
  }),
}));

export const insertExpenseSchema = createInsertSchema(expenses, {
  amount: z.number().min(0, "Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  expenseDate: z.string().min(1, "Date is required"),
});
export const selectExpenseSchema = createSelectSchema(expenses);
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

export const scholarships = pgTable("scholarships", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  discountType: text("discount_type").notNull(),
  discountValue: integer("discount_value").notNull(),
  feeTypes: json("fee_types").$type<string[]>().default([]),
  description: text("description"),
  eligibilityCriteria: text("eligibility_criteria"),
  maxBeneficiaries: integer("max_beneficiaries"),
  validFrom: text("valid_from"),
  validTo: text("valid_to"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("scholarships_school_idx").on(table.schoolId),
}));

export const scholarshipsRelations = relations(scholarships, ({ one, many }) => ({
  school: one(schools, {
    fields: [scholarships.schoolId],
    references: [schools.id],
  }),
  studentScholarships: many(studentScholarships),
}));

export const insertScholarshipSchema = createInsertSchema(scholarships, {
  name: z.string().min(1, "Scholarship name is required"),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().min(0, "Discount must be positive"),
});
export const selectScholarshipSchema = createSelectSchema(scholarships);
export type Scholarship = typeof scholarships.$inferSelect;
export type InsertScholarship = typeof scholarships.$inferInsert;

export const studentScholarships = pgTable("student_scholarships", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  scholarshipId: integer("scholarship_id").notNull().references(() => scholarships.id, { onDelete: "cascade" }),
  term: integer("term"),
  year: integer("year").notNull(),
  status: text("status").default("active"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("student_scholarships_school_idx").on(table.schoolId),
  studentIdx: index("student_scholarships_student_idx").on(table.studentId),
  scholarshipIdx: index("student_scholarships_scholarship_idx").on(table.scholarshipId),
  studentScholarshipUnique: unique().on(table.studentId, table.scholarshipId, table.year, table.term),
}));

export const studentScholarshipsRelations = relations(studentScholarships, ({ one }) => ({
  school: one(schools, {
    fields: [studentScholarships.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [studentScholarships.studentId],
    references: [students.id],
  }),
  scholarship: one(scholarships, {
    fields: [studentScholarships.scholarshipId],
    references: [scholarships.id],
  }),
  approver: one(users, {
    fields: [studentScholarships.approvedBy],
    references: [users.id],
  }),
}));

export const insertStudentScholarshipSchema = createInsertSchema(studentScholarships);
export const selectStudentScholarshipSchema = createSelectSchema(studentScholarships);
export type StudentScholarship = typeof studentScholarships.$inferSelect;
export type InsertStudentScholarship = typeof studentScholarships.$inferInsert;

// Student Fee Overrides - custom fees per student
export const studentFeeOverrides = pgTable("student_fee_overrides", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  feeType: text("fee_type").notNull(),
  customAmount: integer("custom_amount").notNull(),
  term: integer("term"),
  year: integer("year").notNull(),
  reason: text("reason"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("student_fee_overrides_school_idx").on(table.schoolId),
  studentIdx: index("student_fee_overrides_student_idx").on(table.studentId),
  studentFeeUnique: unique().on(table.studentId, table.feeType, table.year, table.term),
}));

export const studentFeeOverridesRelations = relations(studentFeeOverrides, ({ one }) => ({
  school: one(schools, {
    fields: [studentFeeOverrides.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [studentFeeOverrides.studentId],
    references: [students.id],
  }),
  creator: one(users, {
    fields: [studentFeeOverrides.createdBy],
    references: [users.id],
  }),
}));

export const insertStudentFeeOverrideSchema = createInsertSchema(studentFeeOverrides, {
  feeType: z.string().min(1, "Fee type is required"),
  customAmount: z.number().min(0, "Amount must be positive"),
  year: z.number().min(2020, "Valid year is required"),
});
export const selectStudentFeeOverrideSchema = createSelectSchema(studentFeeOverrides);
export type StudentFeeOverride = typeof studentFeeOverrides.$inferSelect;
export type InsertStudentFeeOverride = typeof studentFeeOverrides.$inferInsert;

// ==================== ATTENDANCE MODULE ====================

// Gate Attendance - for day scholar check-in/check-out
export const gateAttendance = pgTable("gate_attendance", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD format
  checkInTime: text("check_in_time"), // HH:MM format
  checkOutTime: text("check_out_time"),
  checkInMethod: text("check_in_method").default("manual"), // 'qr', 'face', 'manual'
  checkOutMethod: text("check_out_method"),
  status: text("status").default("present"), // 'present', 'late', 'absent', 'left_early'
  capturedById: integer("captured_by_id").references(() => users.id),
  deviceInfo: text("device_info"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("gate_attendance_school_idx").on(table.schoolId),
  studentIdx: index("gate_attendance_student_idx").on(table.studentId),
  dateIdx: index("gate_attendance_date_idx").on(table.date),
  studentDateUnique: unique().on(table.studentId, table.date),
}));

export const gateAttendanceRelations = relations(gateAttendance, ({ one }) => ({
  school: one(schools, {
    fields: [gateAttendance.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [gateAttendance.studentId],
    references: [students.id],
  }),
  capturedBy: one(users, {
    fields: [gateAttendance.capturedById],
    references: [users.id],
  }),
}));

export const insertGateAttendanceSchema = createInsertSchema(gateAttendance);
export const selectGateAttendanceSchema = createSelectSchema(gateAttendance);
export type GateAttendance = typeof gateAttendance.$inferSelect;
export type InsertGateAttendance = typeof gateAttendance.$inferInsert;

// Class Attendance - for subject/period attendance
export const classAttendance = pgTable("class_attendance", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  classLevel: text("class_level").notNull(),
  stream: text("stream"),
  date: text("date").notNull(),
  period: integer("period"), // 1-8 for different periods
  subject: text("subject"),
  status: text("status").default("present"), // 'present', 'absent', 'late', 'excused'
  method: text("method").default("manual"), // 'qr', 'face', 'manual'
  markedById: integer("marked_by_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("class_attendance_school_idx").on(table.schoolId),
  studentIdx: index("class_attendance_student_idx").on(table.studentId),
  dateIdx: index("class_attendance_date_idx").on(table.date),
  classDateIdx: index("class_attendance_class_date_idx").on(table.classLevel, table.date),
  studentDatePeriodUnique: unique().on(table.studentId, table.date, table.period),
}));

export const classAttendanceRelations = relations(classAttendance, ({ one }) => ({
  school: one(schools, {
    fields: [classAttendance.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [classAttendance.studentId],
    references: [students.id],
  }),
  markedBy: one(users, {
    fields: [classAttendance.markedById],
    references: [users.id],
  }),
}));

export const insertClassAttendanceSchema = createInsertSchema(classAttendance);
export const selectClassAttendanceSchema = createSelectSchema(classAttendance);
export type ClassAttendance = typeof classAttendance.$inferSelect;
export type InsertClassAttendance = typeof classAttendance.$inferInsert;

// Teacher Attendance
export const teacherAttendance = pgTable("teacher_attendance", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  teacherId: integer("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  checkInTime: text("check_in_time"),
  checkOutTime: text("check_out_time"),
  checkInMethod: text("check_in_method").default("manual"),
  checkOutMethod: text("check_out_method"),
  status: text("status").default("present"), // 'present', 'late', 'absent', 'half_day', 'on_leave'
  leaveType: text("leave_type"), // 'sick', 'personal', 'official', etc.
  checkInLatitude: real("check_in_latitude"),
  checkInLongitude: real("check_in_longitude"),
  checkInAccuracy: real("check_in_accuracy"),
  checkInDistance: real("check_in_distance"),
  faceMatchConfidence: real("face_match_confidence"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("teacher_attendance_school_idx").on(table.schoolId),
  teacherIdx: index("teacher_attendance_teacher_idx").on(table.teacherId),
  dateIdx: index("teacher_attendance_date_idx").on(table.date),
  teacherDateUnique: unique().on(table.teacherId, table.date),
}));

export const teacherAttendanceRelations = relations(teacherAttendance, ({ one }) => ({
  school: one(schools, {
    fields: [teacherAttendance.schoolId],
    references: [schools.id],
  }),
  teacher: one(teachers, {
    fields: [teacherAttendance.teacherId],
    references: [teachers.id],
  }),
}));

export const insertTeacherAttendanceSchema = createInsertSchema(teacherAttendance);
export const selectTeacherAttendanceSchema = createSelectSchema(teacherAttendance);
export type TeacherAttendance = typeof teacherAttendance.$inferSelect;
export type InsertTeacherAttendance = typeof teacherAttendance.$inferInsert;

// Face Embeddings - store compact face vectors for recognition (no large photos)
export const faceEmbeddings = pgTable("face_embeddings", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  personType: text("person_type").notNull(), // 'student' or 'teacher'
  personId: integer("person_id").notNull(), // references student.id or teacher.id
  embedding: json("embedding").notNull().$type<number[]>(), // JSON array of 128 floats
  quality: real("quality").default(0),
  captureVersion: integer("capture_version").default(1),
  thumbnailBase64: text("thumbnail_base64"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("face_embeddings_school_idx").on(table.schoolId),
  personIdx: index("face_embeddings_person_idx").on(table.personType, table.personId),
  personUnique: unique().on(table.schoolId, table.personType, table.personId),
}));

export const insertFaceEmbeddingSchema = createInsertSchema(faceEmbeddings);
export const selectFaceEmbeddingSchema = createSelectSchema(faceEmbeddings);
export type FaceEmbedding = typeof faceEmbeddings.$inferSelect;
export type InsertFaceEmbedding = typeof faceEmbeddings.$inferInsert;

// Attendance Settings per school
export const attendanceSettings = pgTable("attendance_settings", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }).unique(),
  schoolStartTime: text("school_start_time").default("08:00"),
  lateThresholdMinutes: integer("late_threshold_minutes").default(15),
  gateCloseTime: text("gate_close_time").default("08:30"),
  schoolEndTime: text("school_end_time").default("16:30"),
  enableFaceRecognition: boolean("enable_face_recognition").default(false),
  enableQrScanning: boolean("enable_qr_scanning").default(true),
  requireFaceForGate: boolean("require_face_for_gate").default(false),
  requireFaceForTeachers: boolean("require_face_for_teachers").default(false),
  faceConfidenceThreshold: real("face_confidence_threshold").default(0.6),
  enableGeofencing: boolean("enable_geofencing").default(false),
  schoolLatitude: real("school_latitude"),
  schoolLongitude: real("school_longitude"),
  geofenceRadiusMeters: integer("geofence_radius_meters").default(100),
  periodsPerDay: integer("periods_per_day").default(8),
  periodDurationMinutes: integer("period_duration_minutes").default(40),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const attendanceSettingsRelations = relations(attendanceSettings, ({ one }) => ({
  school: one(schools, {
    fields: [attendanceSettings.schoolId],
    references: [schools.id],
  }),
}));

export const insertAttendanceSettingsSchema = createInsertSchema(attendanceSettings);
export const selectAttendanceSettingsSchema = createSelectSchema(attendanceSettings);
export type AttendanceSettings = typeof attendanceSettings.$inferSelect;
export type InsertAttendanceSettings = typeof attendanceSettings.$inferInsert;

// ============================================
// BOARDING MANAGEMENT MODULE
// ============================================

// Dormitories
export const dormitories = pgTable("dormitories", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  gender: text("gender").notNull(), // 'male', 'female', 'mixed'
  capacity: integer("capacity").default(0),
  building: text("building"),
  floor: text("floor"),
  wardenName: text("warden_name"),
  wardenPhone: text("warden_phone"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("dormitories_school_idx").on(table.schoolId),
  nameSchoolUnique: unique().on(table.schoolId, table.name),
}));

export const dormitoriesRelations = relations(dormitories, ({ one, many }) => ({
  school: one(schools, {
    fields: [dormitories.schoolId],
    references: [schools.id],
  }),
  beds: many(beds),
}));

export const insertDormitorySchema = createInsertSchema(dormitories);
export const selectDormitorySchema = createSelectSchema(dormitories);
export type Dormitory = typeof dormitories.$inferSelect;
export type InsertDormitory = typeof dormitories.$inferInsert;

// Dormitory Rooms (Deleted)
// export const dormRooms = ...
// export const dormRoomsRelations = ...


// Beds
export const beds = pgTable("beds", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  dormitoryId: integer("dormitory_id").notNull().references(() => dormitories.id, { onDelete: "cascade" }),
  bedNumber: text("bed_number").notNull(), // Structure Identifier (e.g. 1, 2)
  level: text("level").default("single"), // 'single', 'top', 'middle', 'bottom'
  mattressNumber: text("mattress_number"),
  status: text("status").default("available"),
  currentStudentId: integer("current_student_id").references(() => students.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("beds_school_idx").on(table.schoolId),
  dormIdx: index("beds_dorm_idx").on(table.dormitoryId),
  bedUnique: unique().on(table.dormitoryId, table.bedNumber, table.level),
}));

export const bedsRelations = relations(beds, ({ one }) => ({
  school: one(schools, {
    fields: [beds.schoolId],
    references: [schools.id],
  }),
  dormitory: one(dormitories, {
    fields: [beds.dormitoryId],
    references: [dormitories.id],
  }),
  student: one(students, {
    fields: [beds.currentStudentId],
    references: [students.id],
  }),
}));

export const insertBedSchema = createInsertSchema(beds);
export const selectBedSchema = createSelectSchema(beds);
export type Bed = typeof beds.$inferSelect;
export type InsertBed = typeof beds.$inferInsert;

// Boarding Profiles - extended info for boarding students
export const boardingProfiles = pgTable("boarding_profiles", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  dormitoryId: integer("dormitory_id").references(() => dormitories.id, { onDelete: "set null" }),
  bedId: integer("bed_id").references(() => beds.id, { onDelete: "set null" }),
  authorizedGuardians: json("authorized_guardians").$type<{
    name: string;
    relationship: string;
    phone: string;
    nationalId?: string;
    canPickup: boolean;
  }[]>().default([]),
  dietaryRestrictions: text("dietary_restrictions"),
  medicalNotes: text("medical_notes"),
  emergencyInstructions: text("emergency_instructions"),
  transportProvider: text("transport_provider"), // 'school_bus', 'private', 'parent'
  enrollmentDate: text("enrollment_date"),
  withdrawalDate: text("withdrawal_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("boarding_profiles_school_idx").on(table.schoolId),
  studentIdx: index("boarding_profiles_student_idx").on(table.studentId),
  studentUnique: unique().on(table.studentId),
}));

export const boardingProfilesRelations = relations(boardingProfiles, ({ one }) => ({
  school: one(schools, {
    fields: [boardingProfiles.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [boardingProfiles.studentId],
    references: [students.id],
  }),
  dormitory: one(dormitories, {
    fields: [boardingProfiles.dormitoryId],
    references: [dormitories.id],
  }),
  bed: one(beds, {
    fields: [boardingProfiles.bedId],
    references: [beds.id],
  }),
}));

export const insertBoardingProfileSchema = createInsertSchema(boardingProfiles);
export const selectBoardingProfileSchema = createSelectSchema(boardingProfiles);
export type BoardingProfile = typeof boardingProfiles.$inferSelect;
export type InsertBoardingProfile = typeof boardingProfiles.$inferInsert;

// Boarding Roll Calls - morning/evening attendance
export const boardingRollCalls = pgTable("boarding_roll_calls", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  dormitoryId: integer("dormitory_id").references(() => dormitories.id, { onDelete: "set null" }),
  date: text("date").notNull(), // YYYY-MM-DD
  session: text("session").notNull(), // 'morning', 'evening', 'night'
  sessionTime: text("session_time"), // actual time marked
  status: text("status").default("present"), // 'present', 'absent', 'sick_bay', 'on_leave', 'late'
  method: text("method").default("manual"), // 'manual', 'qr', 'face'
  markedById: integer("marked_by_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("boarding_roll_calls_school_idx").on(table.schoolId),
  studentIdx: index("boarding_roll_calls_student_idx").on(table.studentId),
  dateIdx: index("boarding_roll_calls_date_idx").on(table.date),
  studentDateSessionUnique: unique().on(table.studentId, table.date, table.session),
}));

export const boardingRollCallsRelations = relations(boardingRollCalls, ({ one }) => ({
  school: one(schools, {
    fields: [boardingRollCalls.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [boardingRollCalls.studentId],
    references: [students.id],
  }),
  dormitory: one(dormitories, {
    fields: [boardingRollCalls.dormitoryId],
    references: [dormitories.id],
  }),
  markedBy: one(users, {
    fields: [boardingRollCalls.markedById],
    references: [users.id],
  }),
}));

export const insertBoardingRollCallSchema = createInsertSchema(boardingRollCalls);
export const selectBoardingRollCallSchema = createSelectSchema(boardingRollCalls);
export type BoardingRollCall = typeof boardingRollCalls.$inferSelect;
export type InsertBoardingRollCall = typeof boardingRollCalls.$inferInsert;

// Leave Requests - exeat and permission to leave
export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  leaveType: text("leave_type").notNull(), // 'weekend', 'holiday', 'emergency', 'medical', 'family_event'
  reason: text("reason").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  expectedReturnTime: text("expected_return_time"),
  guardianName: text("guardian_name").notNull(),
  guardianPhone: text("guardian_phone").notNull(),
  guardianRelationship: text("guardian_relationship"),
  transportMode: text("transport_mode"), // 'school_bus', 'picked_up', 'public_transport'
  destination: text("destination"),
  status: text("status").default("pending"), // 'pending', 'approved', 'rejected', 'checked_out', 'returned', 'overdue'
  requestedAt: timestamp("requested_at").defaultNow(),
  requestedById: integer("requested_by_id").references(() => users.id),
  approvedById: integer("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  approverNotes: text("approver_notes"),
  checkOutTime: text("check_out_time"),
  checkOutById: integer("check_out_by_id").references(() => users.id),
  checkInTime: text("check_in_time"),
  checkInById: integer("check_in_by_id").references(() => users.id),
  returnNotes: text("return_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("leave_requests_school_idx").on(table.schoolId),
  studentIdx: index("leave_requests_student_idx").on(table.studentId),
  statusIdx: index("leave_requests_status_idx").on(table.status),
  dateIdx: index("leave_requests_date_idx").on(table.startDate),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  school: one(schools, {
    fields: [leaveRequests.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [leaveRequests.studentId],
    references: [students.id],
  }),
  requestedBy: one(users, {
    fields: [leaveRequests.requestedById],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [leaveRequests.approvedById],
    references: [users.id],
  }),
}));

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests);
export const selectLeaveRequestSchema = createSelectSchema(leaveRequests);
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = typeof leaveRequests.$inferInsert;

// Visitor Logs - for visiting days
export const visitorLogs = pgTable("visitor_logs", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  visitorName: text("visitor_name").notNull(),
  visitorPhone: text("visitor_phone"),
  visitorRelationship: text("visitor_relationship").notNull(),
  visitorNationalId: text("visitor_national_id"),
  visitDate: text("visit_date").notNull(),
  checkInTime: text("check_in_time"),
  checkOutTime: text("check_out_time"),
  purpose: text("purpose"),
  itemsBrought: text("items_brought"),
  registeredById: integer("registered_by_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("visitor_logs_school_idx").on(table.schoolId),
  studentIdx: index("visitor_logs_student_idx").on(table.studentId),
  dateIdx: index("visitor_logs_date_idx").on(table.visitDate),
}));

export const visitorLogsRelations = relations(visitorLogs, ({ one }) => ({
  school: one(schools, {
    fields: [visitorLogs.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [visitorLogs.studentId],
    references: [students.id],
  }),
  registeredBy: one(users, {
    fields: [visitorLogs.registeredById],
    references: [users.id],
  }),
}));

export const insertVisitorLogSchema = createInsertSchema(visitorLogs);
export const selectVisitorLogSchema = createSelectSchema(visitorLogs);
export type VisitorLog = typeof visitorLogs.$inferSelect;
export type InsertVisitorLog = typeof visitorLogs.$inferInsert;

// Boarding Settings
export const boardingSettings = pgTable("boarding_settings", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }).unique(),
  morningRollCallTime: text("morning_roll_call_time").default("06:30"),
  eveningRollCallTime: text("evening_roll_call_time").default("20:00"),
  nightRollCallTime: text("night_roll_call_time").default("22:00"),
  enableMorningRollCall: boolean("enable_morning_roll_call").default(true),
  enableEveningRollCall: boolean("enable_evening_roll_call").default(true),
  enableNightRollCall: boolean("enable_night_roll_call").default(false),
  visitingDays: json("visiting_days").$type<string[]>().default(["Sunday"]),
  visitingHoursStart: text("visiting_hours_start").default("14:00"),
  visitingHoursEnd: text("visiting_hours_end").default("17:00"),
  requireGuardianApproval: boolean("require_guardian_approval").default(true),
  autoMarkAbsentAfterMinutes: integer("auto_mark_absent_after_minutes").default(30),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const boardingSettingsRelations = relations(boardingSettings, ({ one }) => ({
  school: one(schools, {
    fields: [boardingSettings.schoolId],
    references: [schools.id],
  }),
}));

export const insertBoardingSettingsSchema = createInsertSchema(boardingSettings);
export const selectBoardingSettingsSchema = createSelectSchema(boardingSettings);
export type BoardingSettings = typeof boardingSettings.$inferSelect;
export type InsertBoardingSettings = typeof boardingSettings.$inferInsert;

// ==================== IN-APP MESSAGING ====================

// Conversations - represents a message thread between users
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  type: text("type").default("direct"), // 'direct', 'group', 'announcement'
  isGroup: boolean("is_group").default(false),
  groupName: text("group_name"),
  groupAvatar: text("group_avatar"),
  admins: json("admins").$type<number[]>().default([]),
  createdById: integer("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("conversations_school_idx").on(table.schoolId),
  createdByIdx: index("conversations_created_by_idx").on(table.createdById),
  lastMessageIdx: index("conversations_last_message_idx").on(table.lastMessageAt),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  school: one(schools, {
    fields: [conversations.schoolId],
    references: [schools.id],
  }),
  createdBy: one(users, {
    fields: [conversations.createdById],
    references: [users.id],
  }),
  participants: many(conversationParticipants),
  messages: many(messages),
}));

export const insertConversationSchema = createInsertSchema(conversations);
export const selectConversationSchema = createSelectSchema(conversations);
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// Conversation Participants - junction table for users in a conversation
export const conversationParticipants = pgTable("conversation_participants", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastReadAt: timestamp("last_read_at"),
  lastReadMessageId: integer("last_read_message_id"), // Track specific message read
  isArchived: boolean("is_archived").default(false),
  isMuted: boolean("is_muted").default(false),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  conversationIdx: index("conv_participants_conversation_idx").on(table.conversationId),
  userIdx: index("conv_participants_user_idx").on(table.userId),
  conversationUserUnique: unique().on(table.conversationId, table.userId),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [conversationParticipants.userId],
    references: [users.id],
  }),
}));

export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants);
export const selectConversationParticipantSchema = createSelectSchema(conversationParticipants);
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type InsertConversationParticipant = typeof conversationParticipants.$inferInsert;

// Messages - individual messages within a conversation
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"), // 'text', 'file', 'image', 'audio'
  attachmentUrl: text("attachment_url"),
  attachmentName: text("attachment_name"),
  attachments: json("attachments").$type<{ url: string; name: string; type: string; size?: number }[]>().default([]),
  reactions: json("reactions").$type<{ userId: number; emoji: string }[]>().default([]),
  replyToId: integer("reply_to_id"),
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  conversationIdx: index("messages_conversation_idx").on(table.conversationId),
  senderIdx: index("messages_sender_idx").on(table.senderId),
  createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ============================================
// SUPERVISION & APPRAISAL MODULE
// ============================================

// Observation Criteria - customizable checklist items for observations
export const observationCriteria = pgTable("observation_criteria", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // 'lesson_planning', 'teaching_methods', 'classroom_management', 'learner_engagement', 'assessment'
  criterion: text("criterion").notNull(),
  description: text("description"),
  maxScore: integer("max_score").default(5),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("observation_criteria_school_idx").on(table.schoolId),
  categoryIdx: index("observation_criteria_category_idx").on(table.category),
}));

export const observationCriteriaRelations = relations(observationCriteria, ({ one }) => ({
  school: one(schools, {
    fields: [observationCriteria.schoolId],
    references: [schools.id],
  }),
}));

export const insertObservationCriteriaSchema = createInsertSchema(observationCriteria);
export const selectObservationCriteriaSchema = createSelectSchema(observationCriteria);
export type ObservationCriteria = typeof observationCriteria.$inferSelect;
export type InsertObservationCriteria = typeof observationCriteria.$inferInsert;

// Observations - teacher classroom observations
export const observations = pgTable("observations", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  teacherId: integer("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  observerId: integer("observer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  observationDate: text("observation_date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  classLevel: text("class_level").notNull(),
  stream: text("stream"),
  subject: text("subject").notNull(),
  lessonTopic: text("lesson_topic"),
  numberOfLearners: integer("number_of_learners"),
  scores: json("scores").$type<{ criteriaId: number; score: number; comment?: string }[]>().default([]),
  totalScore: integer("total_score").default(0),
  maxPossibleScore: integer("max_possible_score").default(0),
  percentage: integer("percentage").default(0),
  overallRating: text("overall_rating"), // 'excellent', 'very_good', 'good', 'satisfactory', 'needs_improvement'
  strengths: text("strengths"),
  areasForImprovement: text("areas_for_improvement"),
  recommendations: text("recommendations"),
  teacherReflection: text("teacher_reflection"),
  followUpDate: text("follow_up_date"),
  followUpCompleted: boolean("follow_up_completed").default(false),
  followUpNotes: text("follow_up_notes"),
  status: text("status").default("scheduled"), // 'scheduled', 'in_progress', 'completed', 'cancelled'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("observations_school_idx").on(table.schoolId),
  teacherIdx: index("observations_teacher_idx").on(table.teacherId),
  observerIdx: index("observations_observer_idx").on(table.observerId),
  dateIdx: index("observations_date_idx").on(table.observationDate),
}));

export const observationsRelations = relations(observations, ({ one }) => ({
  school: one(schools, {
    fields: [observations.schoolId],
    references: [schools.id],
  }),
  teacher: one(teachers, {
    fields: [observations.teacherId],
    references: [teachers.id],
  }),
  observer: one(users, {
    fields: [observations.observerId],
    references: [users.id],
  }),
}));

export const insertObservationSchema = createInsertSchema(observations);
export const selectObservationSchema = createSelectSchema(observations);
export type Observation = typeof observations.$inferSelect;
export type InsertObservation = typeof observations.$inferInsert;

// Appraisal Cycles - for managing appraisal periods
export const appraisalCycles = pgTable("appraisal_cycles", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Term 1 2025 Appraisal"
  cycleType: text("cycle_type").notNull(), // 'termly', 'annually', 'probation'
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: text("status").default("active"), // 'draft', 'active', 'completed', 'cancelled'
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("appraisal_cycles_school_idx").on(table.schoolId),
  statusIdx: index("appraisal_cycles_status_idx").on(table.status),
}));

export const appraisalCyclesRelations = relations(appraisalCycles, ({ one, many }) => ({
  school: one(schools, {
    fields: [appraisalCycles.schoolId],
    references: [schools.id],
  }),
  createdBy: one(users, {
    fields: [appraisalCycles.createdById],
    references: [users.id],
  }),
  appraisals: many(appraisals),
}));

export const insertAppraisalCycleSchema = createInsertSchema(appraisalCycles);
export const selectAppraisalCycleSchema = createSelectSchema(appraisalCycles);
export type AppraisalCycle = typeof appraisalCycles.$inferSelect;
export type InsertAppraisalCycle = typeof appraisalCycles.$inferInsert;

// Appraisals - staff performance appraisals
export const appraisals = pgTable("appraisals", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  cycleId: integer("cycle_id").references(() => appraisalCycles.id, { onDelete: "set null" }),
  teacherId: integer("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  appraiserId: integer("appraiser_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  appraisalDate: text("appraisal_date").notNull(),
  performanceAreas: json("performance_areas").$type<{
    area: string;
    selfRating: number;
    supervisorRating: number;
    weight: number;
    comments?: string;
  }[]>().default([]),
  selfAssessmentNotes: text("self_assessment_notes"),
  supervisorComments: text("supervisor_comments"),
  achievements: text("achievements"),
  challenges: text("challenges"),
  supportNeeded: text("support_needed"),
  overallSelfRating: integer("overall_self_rating"),
  overallSupervisorRating: integer("overall_supervisor_rating"),
  finalRating: text("final_rating"), // 'outstanding', 'exceeds_expectations', 'meets_expectations', 'needs_improvement', 'unsatisfactory'
  status: text("status").default("draft"), // 'draft', 'self_assessment', 'supervisor_review', 'completed', 'acknowledged'
  acknowledgedByTeacher: boolean("acknowledged_by_teacher").default(false),
  acknowledgedAt: timestamp("acknowledged_at"),
  teacherFeedback: text("teacher_feedback"),
  nextReviewDate: text("next_review_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("appraisals_school_idx").on(table.schoolId),
  teacherIdx: index("appraisals_teacher_idx").on(table.teacherId),
  cycleIdx: index("appraisals_cycle_idx").on(table.cycleId),
  statusIdx: index("appraisals_status_idx").on(table.status),
}));

export const appraisalsRelations = relations(appraisals, ({ one, many }) => ({
  school: one(schools, {
    fields: [appraisals.schoolId],
    references: [schools.id],
  }),
  cycle: one(appraisalCycles, {
    fields: [appraisals.cycleId],
    references: [appraisalCycles.id],
  }),
  teacher: one(teachers, {
    fields: [appraisals.teacherId],
    references: [teachers.id],
  }),
  appraiser: one(users, {
    fields: [appraisals.appraiserId],
    references: [users.id],
  }),
  goals: many(appraisalGoals),
}));

export const insertAppraisalSchema = createInsertSchema(appraisals);
export const selectAppraisalSchema = createSelectSchema(appraisals);
export type Appraisal = typeof appraisals.$inferSelect;
export type InsertAppraisal = typeof appraisals.$inferInsert;

// Appraisal Goals - SMART goals for staff
export const appraisalGoals = pgTable("appraisal_goals", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  appraisalId: integer("appraisal_id").references(() => appraisals.id, { onDelete: "cascade" }),
  teacherId: integer("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  goal: text("goal").notNull(),
  category: text("category"), // 'professional_development', 'student_achievement', 'classroom_management', 'school_contribution'
  specific: text("specific"),
  measurable: text("measurable"),
  achievable: text("achievable"),
  relevant: text("relevant"),
  timebound: text("timebound"),
  targetDate: text("target_date"),
  progress: integer("progress").default(0), // 0-100
  status: text("status").default("not_started"), // 'not_started', 'in_progress', 'completed', 'deferred', 'cancelled'
  progressNotes: text("progress_notes"),
  completedAt: timestamp("completed_at"),
  supervisorVerified: boolean("supervisor_verified").default(false),
  supervisorNotes: text("supervisor_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("appraisal_goals_school_idx").on(table.schoolId),
  teacherIdx: index("appraisal_goals_teacher_idx").on(table.teacherId),
  appraisalIdx: index("appraisal_goals_appraisal_idx").on(table.appraisalId),
  statusIdx: index("appraisal_goals_status_idx").on(table.status),
}));

export const appraisalGoalsRelations = relations(appraisalGoals, ({ one }) => ({
  school: one(schools, {
    fields: [appraisalGoals.schoolId],
    references: [schools.id],
  }),
  appraisal: one(appraisals, {
    fields: [appraisalGoals.appraisalId],
    references: [appraisals.id],
  }),
  teacher: one(teachers, {
    fields: [appraisalGoals.teacherId],
    references: [teachers.id],
  }),
}));

export const insertAppraisalGoalSchema = createInsertSchema(appraisalGoals);
export const selectAppraisalGoalSchema = createSelectSchema(appraisalGoals);
export type AppraisalGoal = typeof appraisalGoals.$inferSelect;
export type InsertAppraisalGoal = typeof appraisalGoals.$inferInsert;

// ============================================
// PLANNING & PROGRAMMING MODULE
// ============================================

// Term Work Plans - termly activity layouts
export const termPlans = pgTable("term_plans", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  term: integer("term").notNull(),
  year: integer("year").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  theme: text("theme"),
  objectives: json("objectives").$type<string[]>().default([]),
  keyActivities: json("key_activities").$type<{
    week: number;
    activity: string;
    description?: string;
    responsible?: string;
  }[]>().default([]),
  status: text("status").default("draft"), // 'draft', 'active', 'completed'
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("term_plans_school_idx").on(table.schoolId),
  termYearIdx: index("term_plans_term_year_idx").on(table.term, table.year),
}));

export const termPlansRelations = relations(termPlans, ({ one, many }) => ({
  school: one(schools, {
    fields: [termPlans.schoolId],
    references: [schools.id],
  }),
  createdBy: one(users, {
    fields: [termPlans.createdById],
    references: [users.id],
  }),
  events: many(schoolEvents),
}));

export const insertTermPlanSchema = createInsertSchema(termPlans);
export const selectTermPlanSchema = createSelectSchema(termPlans);
export type TermPlan = typeof termPlans.$inferSelect;
export type InsertTermPlan = typeof termPlans.$inferInsert;

// School Events - visitation days, sports, meetings, etc.
export const schoolEvents = pgTable("school_events", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  termPlanId: integer("term_plan_id").references(() => termPlans.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  eventType: text("event_type").notNull(), // 'visitation_day', 'sports', 'meeting', 'exam', 'holiday', 'assembly', 'graduation', 'open_day', 'other'
  description: text("description"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  venue: text("venue"),
  targetAudience: text("target_audience"), // 'all', 'students', 'staff', 'parents', 'specific_classes'
  targetClasses: json("target_classes").$type<string[]>().default([]),
  budget: integer("budget"),
  status: text("status").default("planned"), // 'planned', 'in_progress', 'completed', 'cancelled', 'postponed'
  notes: text("notes"),
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: text("recurrence_pattern"), // 'weekly', 'monthly', 'termly', 'annually'
  coordinatorId: integer("coordinator_id").references(() => users.id),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("school_events_school_idx").on(table.schoolId),
  dateIdx: index("school_events_date_idx").on(table.startDate),
  typeIdx: index("school_events_type_idx").on(table.eventType),
}));

export const schoolEventsRelations = relations(schoolEvents, ({ one, many }) => ({
  school: one(schools, {
    fields: [schoolEvents.schoolId],
    references: [schools.id],
  }),
  termPlan: one(termPlans, {
    fields: [schoolEvents.termPlanId],
    references: [termPlans.id],
  }),
  coordinator: one(users, {
    fields: [schoolEvents.coordinatorId],
    references: [users.id],
  }),
  committees: many(eventCommittees),
  tasks: many(eventTasks),
}));

export const insertSchoolEventSchema = createInsertSchema(schoolEvents);
export const selectSchoolEventSchema = createSelectSchema(schoolEvents);
export type SchoolEvent = typeof schoolEvents.$inferSelect;
export type InsertSchoolEvent = typeof schoolEvents.$inferInsert;

// Event Committees - assigning staff to event roles
export const eventCommittees = pgTable("event_committees", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  eventId: integer("event_id").notNull().references(() => schoolEvents.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'chairperson', 'secretary', 'member', 'coordinator', 'advisor'
  responsibilities: text("responsibilities"),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => ({
  eventIdx: index("event_committees_event_idx").on(table.eventId),
  userIdx: index("event_committees_user_idx").on(table.userId),
  eventUserUnique: unique().on(table.eventId, table.userId),
}));

export const eventCommitteesRelations = relations(eventCommittees, ({ one }) => ({
  school: one(schools, {
    fields: [eventCommittees.schoolId],
    references: [schools.id],
  }),
  event: one(schoolEvents, {
    fields: [eventCommittees.eventId],
    references: [schoolEvents.id],
  }),
  user: one(users, {
    fields: [eventCommittees.userId],
    references: [users.id],
  }),
}));

export const insertEventCommitteeSchema = createInsertSchema(eventCommittees);
export const selectEventCommitteeSchema = createSelectSchema(eventCommittees);
export type EventCommittee = typeof eventCommittees.$inferSelect;
export type InsertEventCommittee = typeof eventCommittees.$inferInsert;

// Event Tasks - specific tasks for events with tracking
export const eventTasks = pgTable("event_tasks", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  eventId: integer("event_id").notNull().references(() => schoolEvents.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  assignedToId: integer("assigned_to_id").references(() => users.id),
  dueDate: text("due_date"),
  priority: text("priority").default("medium"), // 'low', 'medium', 'high', 'urgent'
  status: text("status").default("pending"), // 'pending', 'in_progress', 'completed', 'cancelled'
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  eventIdx: index("event_tasks_event_idx").on(table.eventId),
  assignedIdx: index("event_tasks_assigned_idx").on(table.assignedToId),
  statusIdx: index("event_tasks_status_idx").on(table.status),
}));

export const eventTasksRelations = relations(eventTasks, ({ one }) => ({
  school: one(schools, {
    fields: [eventTasks.schoolId],
    references: [schools.id],
  }),
  event: one(schoolEvents, {
    fields: [eventTasks.eventId],
    references: [schoolEvents.id],
  }),
  assignedTo: one(users, {
    fields: [eventTasks.assignedToId],
    references: [users.id],
  }),
}));

export const insertEventTaskSchema = createInsertSchema(eventTasks);
export const selectEventTaskSchema = createSelectSchema(eventTasks);
export type EventTask = typeof eventTasks.$inferSelect;
export type InsertEventTask = typeof eventTasks.$inferInsert;

// School Routines - daily/weekly routine definitions
export const schoolRoutines = pgTable("school_routines", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Normal Day Routine", "Exam Day Routine"
  description: text("description"),
  appliesTo: text("applies_to").default("all"), // 'all', 'boarders', 'day_scholars'
  dayOfWeek: json("day_of_week").$type<string[]>().default([]), // ['monday', 'tuesday', ...] or empty for all days
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("school_routines_school_idx").on(table.schoolId),
}));

export const schoolRoutinesRelations = relations(schoolRoutines, ({ one, many }) => ({
  school: one(schools, {
    fields: [schoolRoutines.schoolId],
    references: [schools.id],
  }),
  slots: many(routineSlots),
}));

export const insertSchoolRoutineSchema = createInsertSchema(schoolRoutines);
export const selectSchoolRoutineSchema = createSelectSchema(schoolRoutines);
export type SchoolRoutine = typeof schoolRoutines.$inferSelect;
export type InsertSchoolRoutine = typeof schoolRoutines.$inferInsert;

// Routine Slots - individual time slots within a routine
export const routineSlots = pgTable("routine_slots", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  routineId: integer("routine_id").notNull().references(() => schoolRoutines.id, { onDelete: "cascade" }),
  activity: text("activity").notNull(), // 'wake_up', 'prayers', 'breakfast', 'lesson', 'break', 'lunch', 'games', 'prep', 'dinner', 'lights_out', 'custom'
  customActivity: text("custom_activity"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
}, (table) => ({
  routineIdx: index("routine_slots_routine_idx").on(table.routineId),
}));

export const routineSlotsRelations = relations(routineSlots, ({ one }) => ({
  school: one(schools, {
    fields: [routineSlots.schoolId],
    references: [schools.id],
  }),
  routine: one(schoolRoutines, {
    fields: [routineSlots.routineId],
    references: [schoolRoutines.id],
  }),
}));

export const insertRoutineSlotSchema = createInsertSchema(routineSlots);
export const selectRoutineSlotSchema = createSelectSchema(routineSlots);
export type RoutineSlot = typeof routineSlots.$inferSelect;
export type InsertRoutineSlot = typeof routineSlots.$inferInsert;

// Timetable Periods - period definitions for the school
export const timetablePeriods = pgTable("timetable_periods", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // 'Period 1', 'Break', 'Lunch'
  periodType: text("period_type").notNull(), // 'lesson', 'break', 'assembly', 'games', 'other'
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  duration: integer("duration"), // in minutes
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  appliesTo: json("applies_to").$type<string[]>().default([]), // empty = all classes, or specific classes
}, (table) => ({
  schoolIdx: index("timetable_periods_school_idx").on(table.schoolId),
}));

export const timetablePeriodsRelations = relations(timetablePeriods, ({ one, many }) => ({
  school: one(schools, {
    fields: [timetablePeriods.schoolId],
    references: [schools.id],
  }),
  entries: many(classTimetables),
}));

export const insertTimetablePeriodSchema = createInsertSchema(timetablePeriods);
export const selectTimetablePeriodSchema = createSelectSchema(timetablePeriods);
export type TimetablePeriod = typeof timetablePeriods.$inferSelect;
export type InsertTimetablePeriod = typeof timetablePeriods.$inferInsert;

// Class Timetables - subject assignments per class/period/day
export const classTimetables = pgTable("class_timetables", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  periodId: integer("period_id").notNull().references(() => timetablePeriods.id, { onDelete: "cascade" }),
  classLevel: text("class_level").notNull(),
  stream: text("stream"),
  dayOfWeek: text("day_of_week").notNull(), // 'monday', 'tuesday', etc.
  subject: text("subject"),
  teacherId: integer("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
  room: text("room"),
  notes: text("notes"),
  term: integer("term"),
  year: integer("year"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("class_timetables_school_idx").on(table.schoolId),
  classIdx: index("class_timetables_class_idx").on(table.classLevel, table.stream),
  periodIdx: index("class_timetables_period_idx").on(table.periodId),
  teacherIdx: index("class_timetables_teacher_idx").on(table.teacherId),
  dayIdx: index("class_timetables_day_idx").on(table.dayOfWeek),
}));

export const classTimetablesRelations = relations(classTimetables, ({ one }) => ({
  school: one(schools, {
    fields: [classTimetables.schoolId],
    references: [schools.id],
  }),
  period: one(timetablePeriods, {
    fields: [classTimetables.periodId],
    references: [timetablePeriods.id],
  }),
  teacher: one(teachers, {
    fields: [classTimetables.teacherId],
    references: [teachers.id],
  }),
}));

export const insertClassTimetableSchema = createInsertSchema(classTimetables);
export const selectClassTimetableSchema = createSelectSchema(classTimetables);
export type ClassTimetable = typeof classTimetables.$inferSelect;
export type InsertClassTimetable = typeof classTimetables.$inferInsert;

// Mobile Money Transactions
export const mobileMoneyTransactions = pgTable("mobile_money_transactions", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  paymentId: integer("payment_id").references(() => feePayments.id, { onDelete: "set null" }), // Link if applicable
  provider: text("provider").notNull(), // 'mtn', 'airtel'
  phoneNumber: text("phone_number").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").default("UGX"),
  status: text("status").notNull().default("pending"), // 'pending', 'success', 'failed'
  externalReference: text("external_reference"), // Provider's transaction ID
  description: text("description"),
  entityType: text("entity_type"), // 'invoice', 'plan_installment', 'general_payment'
  entityId: integer("entity_id"), // ID of the invoice or plan
  transactionDate: timestamp("transaction_date").defaultNow(),
  callbackReceivedAt: timestamp("callback_received_at"),
  rawCallbackData: json("raw_callback_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("momo_tx_school_idx").on(table.schoolId),
  statusIdx: index("momo_tx_status_idx").on(table.status),
  extRefIdx: index("momo_tx_ext_ref_idx").on(table.externalReference),
}));

export const mobileMoneyTransactionsRelations = relations(mobileMoneyTransactions, ({ one }) => ({
  school: one(schools, {
    fields: [mobileMoneyTransactions.schoolId],
    references: [schools.id],
  }),
  payment: one(feePayments, {
    fields: [mobileMoneyTransactions.paymentId],
    references: [feePayments.id],
  }),
}));

export const insertMobileMoneyTransactionSchema = createInsertSchema(mobileMoneyTransactions);
export const selectMobileMoneyTransactionSchema = createSelectSchema(mobileMoneyTransactions);
export type MobileMoneyTransaction = typeof mobileMoneyTransactions.$inferSelect;
export type InsertMobileMoneyTransaction = typeof mobileMoneyTransactions.$inferInsert;

// ============ FINANCE MODULE TABLES ============

// Payment Plans - installment plans for students
export const paymentPlans = pgTable("payment_plans", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  planName: text("plan_name"),
  totalAmount: real("total_amount").notNull(),
  downPayment: real("down_payment").default(0),
  installmentCount: integer("installment_count").notNull(),
  frequency: text("frequency").notNull().default("monthly"), // 'weekly', 'monthly'
  startDate: timestamp("start_date").notNull(),
  status: text("status").notNull().default("active"), // 'active', 'completed', 'defaulted', 'cancelled'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("payment_plans_school_idx").on(table.schoolId),
  studentIdx: index("payment_plans_student_idx").on(table.studentId),
  statusIdx: index("payment_plans_status_idx").on(table.status),
}));

export const paymentPlansRelations = relations(paymentPlans, ({ one, many }) => ({
  school: one(schools, {
    fields: [paymentPlans.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [paymentPlans.studentId],
    references: [students.id],
  }),
  invoice: one(invoices, {
    fields: [paymentPlans.invoiceId],
    references: [invoices.id],
  }),
  installments: many(planInstallments),
}));

export const insertPaymentPlanSchema = createInsertSchema(paymentPlans);
export const selectPaymentPlanSchema = createSelectSchema(paymentPlans);
export type PaymentPlan = typeof paymentPlans.$inferSelect;
export type InsertPaymentPlan = typeof paymentPlans.$inferInsert;

// Plan Installments - individual payments in a plan
export const planInstallments = pgTable("plan_installments", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => paymentPlans.id, { onDelete: "cascade" }),
  installmentNumber: integer("installment_number").notNull(),
  dueDate: timestamp("due_date").notNull(),
  amount: real("amount").notNull(),
  paidAmount: real("paid_amount").default(0),
  paidAt: timestamp("paid_at"),
  status: text("status").notNull().default("pending"), // 'pending', 'paid', 'partial', 'overdue'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  planIdx: index("plan_installments_plan_idx").on(table.planId),
  dueDateIdx: index("plan_installments_due_date_idx").on(table.dueDate),
  statusIdx: index("plan_installments_status_idx").on(table.status),
}));

export const planInstallmentsRelations = relations(planInstallments, ({ one }) => ({
  plan: one(paymentPlans, {
    fields: [planInstallments.planId],
    references: [paymentPlans.id],
  }),
}));

export const insertPlanInstallmentSchema = createInsertSchema(planInstallments);
export const selectPlanInstallmentSchema = createSelectSchema(planInstallments);
export type PlanInstallment = typeof planInstallments.$inferSelect;
export type InsertPlanInstallment = typeof planInstallments.$inferInsert;

// ==================== PUSH NOTIFICATIONS ====================

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("push_subscriptions_user_idx").on(table.userId),
  endpointUnique: unique().on(table.endpoint),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}));

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions);
export const selectPushSubscriptionSchema = createSelectSchema(pushSubscriptions);
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// ==================== EVENT PROGRAMS ====================

// Program Items - detailed agenda for an event (Run of Show)
export const programItems = pgTable("program_items", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => schoolEvents.id, { onDelete: "cascade" }),
  title: text("title").notNull(), // e.g. "Opening Prayer"
  startTime: text("start_time"), // "10:00"
  endTime: text("end_time"), // "10:15"
  durationMinutes: integer("duration_minutes"),
  responsiblePerson: text("responsible_person"), // e.g. "Headteacher"
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  eventIdx: index("program_items_event_idx").on(table.eventId),
}));

export const programItemsRelations = relations(programItems, ({ one }) => ({
  event: one(schoolEvents, {
    fields: [programItems.eventId],
    references: [schoolEvents.id],
  }),
}));

export const insertProgramItemSchema = createInsertSchema(programItems);
export const selectProgramItemSchema = createSelectSchema(programItems);
export type ProgramItem = typeof programItems.$inferSelect;
export type InsertProgramItem = typeof programItems.$inferInsert;

// ==================== ACADEMIC YEAR ARCHIVE ====================

export const studentYearSnapshots = pgTable("student_year_snapshots", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  classLevel: text("class_level").notNull(),
  stream: text("stream").notNull(),
  boardingStatus: text("boarding_status").default("day"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolYearIdx: index("snapshots_school_year_idx").on(table.schoolId, table.year),
  studentYearUnique: unique().on(table.studentId, table.year),
}));

export const studentYearSnapshotsRelations = relations(studentYearSnapshots, ({ one }) => ({
  school: one(schools, {
    fields: [studentYearSnapshots.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [studentYearSnapshots.studentId],
    references: [students.id],
  }),
}));

export const insertStudentYearSnapshotSchema = createInsertSchema(studentYearSnapshots);
export type StudentYearSnapshot = typeof studentYearSnapshots.$inferSelect;

// ==================== DOUBLE-ENTRY ACCOUNTING & FINANCE ====================

// Chart of Accounts
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  accountCode: text("account_code").notNull(),
  accountName: text("account_name").notNull(),
  accountType: text("account_type").notNull(), // 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'
  parentAccountId: integer("parent_account_id"), // Self-referencing for hierarchy
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("accounts_school_idx").on(table.schoolId),
  codeUnique: unique().on(table.schoolId, table.accountCode),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  school: one(schools, {
    fields: [accounts.schoolId],
    references: [schools.id],
  }),
  parentAccount: one(accounts, {
    fields: [accounts.parentAccountId],
    references: [accounts.id],
  }),
  subAccounts: many(accounts),
  journalLines: many(journalLines),
}));

export const insertAccountSchema = createInsertSchema(accounts, {
  accountCode: z.string().min(1, "Account code is required"),
  accountName: z.string().min(1, "Account name is required"),
  accountType: z.enum(["Asset", "Liability", "Equity", "Revenue", "Expense"]),
});
export const selectAccountSchema = createSelectSchema(accounts);
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

// Journal Entries (Headers)
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  entryDate: text("entry_date").notNull(),
  reference: text("reference"), // Receipt No, Invoice No, or manual ref
  description: text("description").notNull(),
  status: text("status").default("draft"), // 'draft', 'posted', 'reversed'
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("journal_entries_school_idx").on(table.schoolId),
  dateIdx: index("journal_entries_date_idx").on(table.entryDate),
}));

// Journal Lines (Details)
export const journalLines = pgTable("journal_lines", {
  id: serial("id").primaryKey(),
  journalEntryId: integer("journal_entry_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "set null" }), // Sub-ledger tracking
  debit: integer("debit").notNull().default(0),
  credit: integer("credit").notNull().default(0),
}, (table) => ({
  entryIdx: index("journal_lines_entry_idx").on(table.journalEntryId),
  accountIdx: index("journal_lines_account_idx").on(table.accountId),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  school: one(schools, {
    fields: [journalEntries.schoolId],
    references: [schools.id],
  }),
  createdBy: one(users, {
    fields: [journalEntries.createdById],
    references: [users.id],
  }),
  lines: many(journalLines),
}));

export const journalLinesRelations = relations(journalLines, ({ one }) => ({
  journalEntry: one(journalEntries, {
    fields: [journalLines.journalEntryId],
    references: [journalEntries.id],
  }),
  account: one(accounts, {
    fields: [journalLines.accountId],
    references: [accounts.id],
  }),
  student: one(students, {
    fields: [journalLines.studentId],
    references: [students.id],
  }),
}));

export const insertJournalEntrySchema = createInsertSchema(journalEntries);
export const selectJournalEntrySchema = createSelectSchema(journalEntries);
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = typeof journalEntries.$inferInsert;

export const insertJournalLineSchema = createInsertSchema(journalLines);
export const selectJournalLineSchema = createSelectSchema(journalLines);
export type JournalLine = typeof journalLines.$inferSelect;
export type InsertJournalLine = typeof journalLines.$inferInsert;

// Budgets
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => expenseCategories.id, { onDelete: "cascade" }),
  term: integer("term").notNull(),
  year: integer("year").notNull(),
  amountAllocated: integer("amount_allocated").notNull(),
  amountSpent: integer("amount_spent").default(0),
  isLocked: boolean("is_locked").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("budgets_school_idx").on(table.schoolId),
  categoryIdx: index("budgets_category_idx").on(table.categoryId),
  termYearCategoryUnique: unique().on(table.schoolId, table.categoryId, table.term, table.year),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  school: one(schools, {
    fields: [budgets.schoolId],
    references: [schools.id],
  }),
  category: one(expenseCategories, {
    fields: [budgets.categoryId],
    references: [expenseCategories.id],
  }),
}));

export const insertBudgetSchema = createInsertSchema(budgets);
export const selectBudgetSchema = createSelectSchema(budgets);
export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

// Petty Cash Accounts
export const pettyCashAccounts = pgTable("petty_cash_accounts", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  custodianId: integer("custodian_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  floatAmount: integer("float_amount").notNull(),
  currentBalance: integer("current_balance").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdx: index("petty_cash_accounts_school_idx").on(table.schoolId),
}));

export const pettyCashTransactions = pgTable("petty_cash_transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => pettyCashAccounts.id, { onDelete: "cascade" }),
  transactionType: text("transaction_type").notNull(), // 'replenish', 'disburse'
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  reference: text("reference"),
  transactionDate: text("transaction_date").notNull(),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  accountIdx: index("petty_cash_transactions_account_idx").on(table.accountId),
}));

export const pettyCashAccountsRelations = relations(pettyCashAccounts, ({ one, many }) => ({
  school: one(schools, {
    fields: [pettyCashAccounts.schoolId],
    references: [schools.id],
  }),
  custodian: one(users, {
    fields: [pettyCashAccounts.custodianId],
    references: [users.id],
  }),
  transactions: many(pettyCashTransactions),
}));

export const pettyCashTransactionsRelations = relations(pettyCashTransactions, ({ one }) => ({
  account: one(pettyCashAccounts, {
    fields: [pettyCashTransactions.accountId],
    references: [pettyCashAccounts.id],
  }),
  createdBy: one(users, {
    fields: [pettyCashTransactions.createdById],
    references: [users.id],
  }),
}));

export const insertPettyCashAccountSchema = createInsertSchema(pettyCashAccounts);
export const selectPettyCashAccountSchema = createSelectSchema(pettyCashAccounts);
export type PettyCashAccount = typeof pettyCashAccounts.$inferSelect;
export type InsertPettyCashAccount = typeof pettyCashAccounts.$inferInsert;

export const insertPettyCashTransactionSchema = createInsertSchema(pettyCashTransactions);
export const selectPettyCashTransactionSchema = createSelectSchema(pettyCashTransactions);
export type PettyCashTransaction = typeof pettyCashTransactions.$inferSelect;
export type InsertPettyCashTransaction = typeof pettyCashTransactions.$inferInsert;
