
import { openDB, DBSchema } from 'idb';
import { Student, Teacher, MarkRecord, SchoolSettings, ClassLevel } from "../types";

interface EduSuiteDB extends DBSchema {
  students: {
    key: number;
    value: Student;
    indexes: { 'by-class': string };
  };
  teachers: {
    key: number;
    value: Teacher;
  };
  marks: {
    key: number;
    value: MarkRecord;
    indexes: { 'by-student': number };
  };
  settings: {
    key: string;
    value: SchoolSettings;
  };
}

const DB_NAME = 'edusuite-db';

const dbPromise = openDB<EduSuiteDB>(DB_NAME, 1, {
  upgrade(db) {
    // Students Store
    const studentStore = db.createObjectStore('students', { keyPath: 'id', autoIncrement: true });
    studentStore.createIndex('by-class', 'classLevel');
    
    // Teachers Store
    db.createObjectStore('teachers', { keyPath: 'id', autoIncrement: true });
    
    // Marks Store
    const markStore = db.createObjectStore('marks', { keyPath: 'id', autoIncrement: true });
    markStore.createIndex('by-student', 'studentId');

    // Settings Store
    db.createObjectStore('settings', { keyPath: 'id' });
  },
});

export const dbService = {
  // --- STUDENTS ---
  getStudents: async () => {
    return (await dbPromise).getAll('students');
  },

  addStudent: async (s: Student) => {
    const { id, ...rest } = s; // Ensure we don't pass an undefined ID for auto-increment
    return (await dbPromise).add('students', rest as Student);
  },

  // Batch insert for CSV imports
  addStudents: async (students: Student[]) => {
    const db = await dbPromise;
    const tx = db.transaction('students', 'readwrite');
    const promises = students.map(s => {
        const { id, ...rest } = s;
        return tx.store.add(rest as Student);
    });
    await Promise.all([...promises, tx.done]);
    return;
  },

  updateStudent: async (s: Student) => {
    if (!s.id) throw new Error("Cannot update student without ID");
    return (await dbPromise).put('students', s);
  },
  
  deleteStudent: async (id: number | string) => {
    // Convert string ID to number if necessary (IDB keys are usually numbers for autoIncrement)
    const numId = Number(id);
    if (isNaN(numId)) throw new Error("Invalid ID format");

    const db = await dbPromise;
    const tx = db.transaction(['students', 'marks'], 'readwrite');
    
    // 1. Delete related Marks
    const markIndex = tx.objectStore('marks').index('by-student');
    const relatedMarks = await markIndex.getAllKeys(numId);
    
    await Promise.all([
        ...relatedMarks.map(markId => tx.objectStore('marks').delete(markId)),
        tx.objectStore('students').delete(numId)
    ]);
    
    await tx.done;
  },

  deleteStudents: async (ids: number[]) => {
    const db = await dbPromise;
    const tx = db.transaction(['students', 'marks'], 'readwrite');
    const markStore = tx.objectStore('marks');
    const studentStore = tx.objectStore('students');
    const markIndex = markStore.index('by-student');

    for (const id of ids) {
         const numId = Number(id); // Ensure number
         if (isNaN(numId)) continue;

        // Delete related marks
        const relatedMarks = await markIndex.getAllKeys(numId);
        for (const markId of relatedMarks) {
            await markStore.delete(markId);
        }
        // Delete student
        await studentStore.delete(numId);
    }
    
    await tx.done;
  },
  
  // --- TEACHERS ---
  getTeachers: async () => {
    return (await dbPromise).getAll('teachers');
  },

  addTeacher: async (t: Teacher) => {
    const { id, ...rest } = t;
    return (await dbPromise).add('teachers', rest as Teacher);
  },

  updateTeacher: async (t: Teacher) => {
    if (!t.id) throw new Error("Cannot update teacher without ID");
    return (await dbPromise).put('teachers', t);
  },

  deleteTeacher: async (id: number) => {
    return (await dbPromise).delete('teachers', id);
  },
  
  // --- MARKS ---
  getMarks: async () => {
    return (await dbPromise).getAll('marks');
  },

  saveMark: async (m: MarkRecord) => {
    const db = await dbPromise;
    
    // Check if mark exists for this Student + Term + Year + Type
    const tx = db.transaction('marks', 'readwrite');
    const index = tx.store.index('by-student');
    const studentMarks = await index.getAll(m.studentId);
    
    const existing = studentMarks.find(ex => 
        ex.term === m.term && 
        ex.year === m.year && 
        ex.type === m.type
    );

    if (existing) {
        // Update existing record, preserving its ID
        await tx.store.put({ ...m, id: existing.id });
    } else {
        // Insert new
        const { id, ...rest } = m;
        await tx.store.add(rest as MarkRecord);
    }
    
    await tx.done;
  },

  saveMarks: async (marks: MarkRecord[]) => {
    const db = await dbPromise;
    const tx = db.transaction('marks', 'readwrite');
    const store = tx.objectStore('marks');
    const index = store.index('by-student');

    for (const m of marks) {
        // Get existing marks for this student
        const existingMarks = await index.getAll(m.studentId);
        const existing = existingMarks.find(ex => 
            ex.term === m.term && 
            ex.year === m.year && 
            ex.type === m.type
        );

        if (existing) {
            await store.put({ ...m, id: existing.id });
        } else {
            const { id, ...rest } = m;
            await store.add(rest as MarkRecord);
        }
    }
    
    await tx.done;
  },

  // --- SETTINGS ---
  getSettings: async (): Promise<SchoolSettings> => {
    const db = await dbPromise;
    const data = await db.get('settings', 'config');
    
    if (data) {
        // Migration: Convert array streams to object streams (old version -> new version)
        if (Array.isArray(data.streams)) {
            const globalStreams = data.streams as string[];
            const newStreams: { [key: string]: string[] } = {};
            Object.values(ClassLevel).forEach(c => {
                newStreams[c] = [...globalStreams];
            });
            // @ts-ignore - overriding type for migration
            data.streams = newStreams;
            
            // Persist the migration
            await db.put('settings', data);
        }
        return data;
    } else {
        // Default Structure - User should update these in Settings
        const defaultStreams: { [key: string]: string[] } = {};
        Object.values(ClassLevel).forEach(c => {
             defaultStreams[c] = ['Stream A', 'Stream B'];
        });

        return {
            id: 'config',
            schoolName: 'Your School Name',
            addressBox: 'Your School Address',
            contactPhones: 'Your Phone Numbers',
            motto: 'Your School Motto',
            regNumber: '',
            centreNumber: '',
            currentTerm: 1,
            currentYear: new Date().getFullYear(),
            nextTermBeginBoarders: '',
            nextTermBeginDay: '',
            streams: defaultStreams
        };
    }
  },

  saveSettings: async (s: SchoolSettings) => {
    return (await dbPromise).put('settings', { ...s, id: 'config' });
  },

  // --- STREAM MANAGEMENT ---
  
  addStream: async (classLevel: string, streamName: string) => {
    const settings = await dbService.getSettings();
    
    if (!settings.streams[classLevel]) {
        settings.streams[classLevel] = [];
    }
    
    if (!settings.streams[classLevel].includes(streamName)) {
        settings.streams[classLevel].push(streamName);
        await dbService.saveSettings(settings);
    }
  },

  removeStream: async (classLevel: string, streamName: string) => {
    const settings = await dbService.getSettings();
    if (settings.streams[classLevel]) {
        settings.streams[classLevel] = settings.streams[classLevel].filter(s => s !== streamName);
        await dbService.saveSettings(settings);
    }
  },

  renameStream: async (classLevel: string, oldName: string, newName: string) => {
    if (oldName === newName) return;
    
    const db = await dbPromise;
    const tx = db.transaction(['settings', 'students', 'teachers'], 'readwrite');
    
    // 1. Update Settings for specific class
    const settings = await tx.objectStore('settings').get('config');
    if (settings && settings.streams && !Array.isArray(settings.streams)) {
        const classStreams = settings.streams[classLevel];
        if (classStreams) {
            const idx = classStreams.indexOf(oldName);
            if (idx !== -1) {
                classStreams[idx] = newName;
                await tx.objectStore('settings').put(settings);
            }
        }
    }

    // 2. Update Students in that class
    let cursorS = await tx.objectStore('students').index('by-class').openCursor(IDBKeyRange.only(classLevel));
    while (cursorS) {
        const student = cursorS.value;
        if (student.stream === oldName) {
            student.stream = newName;
            await cursorS.update(student);
        }
        await cursorS.continue();
    }

    // 3. Update Teachers assigned to that class + stream
    let cursorT = await tx.objectStore('teachers').openCursor();
    while (cursorT) {
        const teacher = cursorT.value;
        let updated = false;
        
        // Check class teacher assignment
        if (teacher.assignedClass === classLevel && teacher.assignedStream === oldName) {
            teacher.assignedStream = newName;
            updated = true;
        }
        
        if (updated) await cursorT.update(teacher);
        await cursorT.continue();
    }

    await tx.done;
  },

  // --- DATA MIGRATION ---

  exportData: async () => {
    const db = await dbPromise;
    const students = await db.getAll('students');
    const teachers = await db.getAll('teachers');
    const marks = await db.getAll('marks');
    const settings = await db.getAll('settings');

    const data = {
        timestamp: new Date().toISOString(),
        students,
        teachers,
        marks,
        settings
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EduSuite_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importData: async (jsonContent: string) => {
    try {
        const data = JSON.parse(jsonContent);
        const db = await dbPromise;
        const tx = db.transaction(['students', 'teachers', 'marks', 'settings'], 'readwrite');

        if (data.students) {
            for (const s of data.students) await tx.objectStore('students').put(s);
        }
        if (data.teachers) {
            for (const t of data.teachers) await tx.objectStore('teachers').put(t);
        }
        if (data.marks) {
            for (const m of data.marks) await tx.objectStore('marks').put(m);
        }
        if (data.settings) {
            for (const s of data.settings) await tx.objectStore('settings').put(s);
        }

        await tx.done;
    } catch (e) {
        console.error("Import failed", e);
        throw new Error("Import failed. Please check the file format.");
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

    try {
      const data = JSON.parse(jsonContent);
      const db = await dbPromise;
      
      const stats = {
        studentsAdded: 0,
        studentsUpdated: 0,
        teachersAdded: 0,
        marksAdded: 0,
        skipped: 0
      };

      if (data.students && data.students.length > 0) {
        const existingStudents = await db.getAll('students');
        const existingByNameClass = new Map(existingStudents.map(s => [`${s.name.toUpperCase()}|${s.classLevel}`, s]));
        const existingById = new Map(existingStudents.map(s => [s.id, s]));

        for (const incoming of data.students) {
          const nameClassKey = `${(incoming.name || '').toUpperCase()}|${incoming.classLevel || ''}`;
          const existingByNameClassMatch = existingByNameClass.get(nameClassKey);
          const existingByIdMatch = incoming.id ? existingById.get(incoming.id) : null;
          const existing = existingByNameClassMatch || existingByIdMatch;

          if (existing) {
            if (updateStudentNames) {
              const updated = {
                ...existing,
                name: incoming.name || existing.name,
                parentName: incoming.parentName || existing.parentName,
                parentContact: incoming.parentContact || existing.parentContact,
                gender: incoming.gender || existing.gender,
                classLevel: incoming.classLevel || existing.classLevel,
                stream: incoming.stream || existing.stream,
                paycode: incoming.paycode || existing.paycode,
              };
              await db.put('students', updated);
              stats.studentsUpdated++;
            } else {
              stats.skipped++;
            }
          } else if (addNewStudents) {
            const { id, ...studentWithoutId } = incoming;
            await db.add('students', studentWithoutId);
            stats.studentsAdded++;
          } else {
            stats.skipped++;
          }
        }
      }

      if (data.teachers && data.teachers.length > 0 && addNewTeachers) {
        const existingTeachers = await db.getAll('teachers');
        const existingNames = new Set(existingTeachers.map(t => t.name.toLowerCase()));

        for (const incoming of data.teachers) {
          if (!existingNames.has(incoming.name.toLowerCase())) {
            const { id, ...teacherWithoutId } = incoming;
            await db.add('teachers', teacherWithoutId);
            stats.teachersAdded++;
          } else {
            stats.skipped++;
          }
        }
      }

      if (data.marks && data.marks.length > 0 && !skipMarks) {
        const existingMarks = await db.getAll('marks');
        const existingKeys = new Set(existingMarks.map(m => 
          `${m.studentId}-${m.year}-${m.term}-${m.type}`
        ));

        for (const incoming of data.marks) {
          const key = `${incoming.studentId}-${incoming.year}-${incoming.term}-${incoming.type}`;
          if (!existingKeys.has(key)) {
            const { id, ...markWithoutId } = incoming;
            await db.add('marks', markWithoutId);
            stats.marksAdded++;
          } else {
            stats.skipped++;
          }
        }
      }

      return stats;
    } catch (e) {
      console.error("Merge failed", e);
      throw new Error("Merge failed. Please check the file format.");
    }
  }
};
