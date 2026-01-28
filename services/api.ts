import { School, AuthUser, UserSchool, SchoolSettings, SecurityConfig, GradingConfig, SubjectConfig, ReportConfig } from '../types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const json = JSON.parse(text);
      message = json.message || text;
    } catch { }
    throw new Error(message);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

async function apiRequest<T>(
  method: string,
  url: string,
  data?: unknown
): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });
  return handleResponse<T>(res);
}

export const authService = {
  getCurrentUser: () => apiRequest<AuthUser>('GET', '/user'),

  login: (username: string, password: string) =>
    apiRequest<AuthUser>('POST', '/login', { username, password }),

  register: (data: { username: string; password: string; name: string; role?: string; email?: string; phone?: string }) =>
    apiRequest<AuthUser>('POST', '/register', data),

  logout: () => apiRequest<void>('POST', '/logout'),

  switchSchool: (schoolId: number) =>
    apiRequest<AuthUser>('POST', '/switch-school', { schoolId }),

  getSchools: () => apiRequest<School[]>('GET', '/schools'),

  createSchool: (school: Partial<School>) =>
    apiRequest<School>('POST', '/schools', school),

  updateSchool: (id: number, data: Partial<School>) =>
    apiRequest<School>('PUT', `/schools/${id}`, data),

  deleteSchool: (id: number) =>
    apiRequest<void>('DELETE', `/schools/${id}`),

  addUserToSchool: (schoolId: number, userId: number, role: string) =>
    apiRequest<void>('POST', `/schools/${schoolId}/users`, { userId, role }),

  removeUserFromSchool: (schoolId: number, userId: number) =>
    apiRequest<void>('DELETE', `/schools/${schoolId}/users/${userId}`),
};

export interface Student {
  id?: number;
  indexNumber: string;
  name: string;
  classLevel: string;
  stream: string;
  gender: string;
  paycode?: string;
  parentName?: string;
  parentContact?: string;
  specialCases: {
    absenteeism: boolean;
    sickness: boolean;
    fees: boolean;
  };
}

export interface Teacher {
  id?: number;
  name: string;
  gender: string;
  phone: string;
  email: string;
  roles: string[];
  assignedClass?: string;
  assignedStream?: string;
  subjects: string[];
  teachingClasses: string[];
}

export interface MarkRecord {
  id?: number;
  studentId: number;
  term: number;
  year: number;
  type: string;
  marks: {
    english?: number;
    maths?: number;
    science?: number;
    sst?: number;
    literacy1?: number;
    literacy2?: number;
  };
  aggregate: number;
  division: string;
  comment?: string;
  status?: string;
}

export type { SchoolSettings, SecurityConfig, GradingConfig, SubjectConfig, ReportConfig };

export const apiService = {
  getStudents: () => apiRequest<Student[]>('GET', '/students'),

  addStudent: (student: Omit<Student, 'id'>) =>
    apiRequest<Student>('POST', '/students', student),

  addStudents: (students: Omit<Student, 'id'>[]) =>
    apiRequest<Student[]>('POST', '/students/batch', { students }),

  updateStudent: (student: Student) =>
    apiRequest<Student>('PUT', `/students/${student.id}`, student),

  deleteStudent: (id: number) =>
    apiRequest<void>('DELETE', `/students/${id}`),

  deleteStudents: (ids: number[]) =>
    apiRequest<void>('DELETE', '/students', { ids }),

  getTeachers: () => apiRequest<Teacher[]>('GET', '/teachers'),

  addTeacher: (teacher: Omit<Teacher, 'id'>) =>
    apiRequest<Teacher>('POST', '/teachers', teacher),

  updateTeacher: (teacher: Teacher) =>
    apiRequest<Teacher>('PUT', `/teachers/${teacher.id}`, teacher),

  deleteTeacher: (id: number) =>
    apiRequest<void>('DELETE', `/teachers/${id}`),

  getMarks: () => apiRequest<MarkRecord[]>('GET', '/marks'),

  saveMark: (mark: Omit<MarkRecord, 'id'>) =>
    apiRequest<MarkRecord>('POST', '/marks', mark),

  saveMarks: (marks: Omit<MarkRecord, 'id'>[]) =>
    apiRequest<MarkRecord[]>('POST', '/marks/batch', { marks }),

  deleteMarks: (studentIds: number[], term: number, year: number, type: string) =>
    apiRequest<{ deleted: number; requested: number; message: string }>('DELETE', '/marks/batch', { studentIds, term, year, type }),

  getSettings: async (): Promise<SchoolSettings> => {
    const settings = await apiRequest<SchoolSettings>('GET', '/settings');
    return {
      ...settings,
      id: settings.id || 'config',
      schoolName: settings.schoolName || 'BROADWAY NURSERY AND PRIMARY SCHOOL',
      addressBox: settings.addressBox || 'P.O.BOX 10, NAAMA-MITYANA',
      contactPhones: settings.contactPhones || '0772324288  0709087676  0744073812',
      motto: settings.motto || 'WE BUILD FOR THE FUTURE',
      regNumber: settings.regNumber || 'ME/P/10247',
      centreNumber: settings.centreNumber || '670135',
      currentTerm: settings.currentTerm || 1,
      currentYear: settings.currentYear || new Date().getFullYear(),
      nextTermBeginBoarders: settings.nextTermBeginBoarders || '',
      nextTermBeginDay: settings.nextTermBeginDay || '',
      streams: settings.streams || {
        P1: [],
        P2: [],
        P3: [],
        P4: [],
        P5: [],
        P6: [],
        P7: [],
      },
    };
  },

  saveSettings: (settings: SchoolSettings) =>
    apiRequest<SchoolSettings>('PUT', '/settings', settings),

  addStream: async (classLevel: string, streamName: string) => {
    const settings = await apiService.getSettings();
    if (!settings.streams[classLevel]) {
      settings.streams[classLevel] = [];
    }
    if (!settings.streams[classLevel].includes(streamName)) {
      settings.streams[classLevel].push(streamName);
      await apiService.saveSettings(settings);
    }
  },

  removeStream: async (classLevel: string, streamName: string) => {
    const settings = await apiService.getSettings();
    if (settings.streams[classLevel]) {
      settings.streams[classLevel] = settings.streams[classLevel].filter(
        (s) => s !== streamName
      );
      await apiService.saveSettings(settings);
    }
  },

  renameStream: async (classLevel: string, oldName: string, newName: string) => {
    if (oldName === newName) return;
    const settings = await apiService.getSettings();
    const classStreams = settings.streams[classLevel];
    if (classStreams) {
      const idx = classStreams.indexOf(oldName);
      if (idx !== -1) {
        classStreams[idx] = newName;
        await apiService.saveSettings(settings);
      }
    }
  },

  exportData: async () => {
    const [students, teachers, marks, settings] = await Promise.all([
      apiService.getStudents(),
      apiService.getTeachers(),
      apiService.getMarks(),
      apiService.getSettings(),
    ]);

    const data = {
      timestamp: new Date().toISOString(),
      students,
      teachers,
      marks,
      settings: [settings],
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EduSuite_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importData: async (jsonContent: string) => {
    const data = JSON.parse(jsonContent);

    const idMapping: { [oldId: number]: number } = {};

    if (data.students && data.students.length > 0) {
      for (const student of data.students) {
        const oldId = student.id;
        const { id, ...studentWithoutId } = student;
        const newStudent = await apiService.addStudent(studentWithoutId);
        if (oldId && newStudent.id) {
          idMapping[oldId] = newStudent.id;
        }
      }
    }

    if (data.teachers && data.teachers.length > 0) {
      for (const t of data.teachers) {
        const { id, ...teacherWithoutId } = t;
        await apiService.addTeacher(teacherWithoutId);
      }
    }

    if (data.marks && data.marks.length > 0) {
      const updatedMarks = data.marks.map((mark: any) => {
        const { id, ...markWithoutId } = mark;
        const newStudentId = idMapping[mark.studentId];
        if (newStudentId) {
          return { ...markWithoutId, studentId: newStudentId };
        }
        return null;
      }).filter(Boolean);

      if (updatedMarks.length > 0) {
        await apiService.saveMarks(updatedMarks);
      }
    }

    if (data.settings && data.settings.length > 0) {
      await apiService.saveSettings(data.settings[0]);
    }
  },

  mergeData: async (jsonContent: string, options: {
    updateStudentNames?: boolean;
    addNewStudents?: boolean;
    addNewTeachers?: boolean;
    skipMarks?: boolean;
  } = {}) => {
    const {
      updateStudentNames = true,
      addNewStudents = true,
      addNewTeachers = true,
      skipMarks = true
    } = options;

    const data = JSON.parse(jsonContent);

    const stats = {
      studentsAdded: 0,
      studentsUpdated: 0,
      teachersAdded: 0,
      marksAdded: 0,
      skipped: 0
    };

    if (data.students && data.students.length > 0) {
      const existingStudents = await apiService.getStudents();
      const existingByIndex = new Map(existingStudents.map(s => [s.indexNumber, s]));

      const studentsToAdd: Omit<Student, 'id'>[] = [];
      const studentsToUpdate: Student[] = [];

      for (const incoming of data.students) {
        const existing = existingByIndex.get(incoming.indexNumber);

        if (existing) {
          if (updateStudentNames) {
            studentsToUpdate.push({
              id: existing.id!,
              indexNumber: existing.indexNumber,
              name: incoming.name || existing.name,
              parentName: incoming.parentName || existing.parentName,
              parentContact: incoming.parentContact || existing.parentContact,
              gender: incoming.gender || existing.gender,
              classLevel: incoming.classLevel || existing.classLevel,
              stream: incoming.stream || existing.stream,
              paycode: incoming.paycode || existing.paycode,
              specialCases: existing.specialCases || { absenteeism: false, sickness: false, fees: false },
            });
            stats.studentsUpdated++;
          } else {
            stats.skipped++;
          }
        } else if (addNewStudents) {
          const { id, ...studentWithoutId } = incoming;
          studentsToAdd.push(studentWithoutId);
          stats.studentsAdded++;
        } else {
          stats.skipped++;
        }
      }

      if (studentsToAdd.length > 0) {
        await apiService.addStudents(studentsToAdd);
      }

      if (studentsToUpdate.length > 0) {
        await apiRequest<void>('PUT', '/students/batch', { students: studentsToUpdate });
      }
    }

    if (data.teachers && data.teachers.length > 0 && addNewTeachers) {
      const existingTeachers = await apiService.getTeachers();
      const existingNames = new Set(existingTeachers.map(t => t.name.toLowerCase()));

      const teachersToAdd: Omit<Teacher, 'id'>[] = [];
      for (const incoming of data.teachers) {
        if (!existingNames.has(incoming.name.toLowerCase())) {
          const { id, ...teacherWithoutId } = incoming;
          teachersToAdd.push(teacherWithoutId);
          stats.teachersAdded++;
        } else {
          stats.skipped++;
        }
      }

      if (teachersToAdd.length > 0) {
        await apiRequest<void>('POST', '/teachers/batch', { teachers: teachersToAdd });
      }
    }

    if (data.marks && data.marks.length > 0 && !skipMarks) {
      const existingMarks = await apiService.getMarks();
      const existingKeys = new Set(existingMarks.map(m =>
        `${m.studentId}-${m.year}-${m.term}-${m.type}`
      ));

      const newMarks = [];
      for (const incoming of data.marks) {
        const key = `${incoming.studentId}-${incoming.year}-${incoming.term}-${incoming.type}`;
        if (!existingKeys.has(key)) {
          const { id, ...markWithoutId } = incoming;
          newMarks.push(markWithoutId);
          stats.marksAdded++;
        } else {
          stats.skipped++;
        }
      }

      if (newMarks.length > 0) {
        await apiService.saveMarks(newMarks);
      }
    }

    return stats;
  },
};

export { apiService as dbService };
