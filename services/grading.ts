
import { ClassLevel, MarkRecord, Student, Gender } from "../types";

export const calculateGrade = (mark: number | undefined): { grade: string; points: number } => {
  if (mark === undefined || mark === null) return { grade: '-', points: 0 }; 
  
  if (mark >= 90) return { grade: 'D1', points: 1 };
  if (mark >= 80) return { grade: 'D2', points: 2 };
  if (mark >= 70) return { grade: 'C3', points: 3 };
  if (mark >= 60) return { grade: 'C4', points: 4 };
  if (mark >= 55) return { grade: 'C5', points: 5 };
  if (mark >= 50) return { grade: 'C6', points: 6 };
  if (mark >= 45) return { grade: 'P7', points: 7 };
  if (mark >= 40) return { grade: 'P8', points: 8 };
  return { grade: 'F9', points: 9 };
};

export const calculateAggregate = (marks: { [key: string]: number | undefined }, classLevel: ClassLevel): number => {
  const isUpper = ['P4', 'P5', 'P6', 'P7'].includes(classLevel);
  const subjects = isUpper 
    ? ['english', 'maths', 'science', 'sst'] 
    : ['english', 'maths', 'literacy1', 'literacy2'];

  let totalPoints = 0;
  let completedSubjects = 0;

  subjects.forEach(sub => {
    const mark = marks[sub];
    if (mark !== undefined && mark !== null) {
      totalPoints += calculateGrade(mark).points;
      completedSubjects++;
    }
  });

  return completedSubjects === 4 ? totalPoints : 0; 
};

export const calculateDivision = (aggregate: number, classLevel: ClassLevel): string => {
  if (aggregate === 0) return '-'; 

  // Standard Ugandan grading (applies to all classes)
  if (aggregate >= 4 && aggregate <= 12) return 'I';
  if (aggregate >= 13 && aggregate <= 24) return 'II';
  if (aggregate >= 25 && aggregate <= 28) return 'III';
  if (aggregate >= 29 && aggregate <= 32) return 'IV';
  if (aggregate >= 33 && aggregate <= 36) return 'U';
  
  return 'U';
};

// --- NEW COMMENT LOGIC ---

// Based on "COMMENTS USED ON REPORT CARDS"
export const getComment = (subject: string, mark: number): string => {
    if (mark >= 95) return "Excellent work";
    if (mark >= 90) return "Very good work";
    if (mark >= 80) return "Good work";
    if (mark >= 70) return "Quite good work. Promising.";
    if (mark >= 60) return "Work harder";
    if (mark >= 50) return "Aim higher than this.";
    if (mark >= 40) return "You can do better than this";
    return "Consult teacher.";
};

const getPronouns = (gender: Gender) => {
    return {
        sub: gender === Gender.Female ? 'She' : 'He',
        obj: gender === Gender.Female ? 'her' : 'him',
        pos: gender === Gender.Female ? 'her' : 'his',
        sub_lower: gender === Gender.Female ? 'she' : 'he'
    };
};

export const getClassTeacherComment = (aggregate: number, student: Student): string => {
    const p = getPronouns(student.gender);
    const name = student.name.split(' ')[0] || 'Learner'; // Use first name

    // 1. Check Special Cases first
    if (student.specialCases.absenteeism) {
        return `${name} has underperformed due to absenteeism. ${p.sub} should try to be present throughout the term in order to perform better than this.`;
    }
    if (student.specialCases.sickness) {
        return `${name} has been affected by sickness this term. ${p.sub} can perform better than this.`;
    }
    if (student.specialCases.fees) {
        return `${name} is often sent home for school fees and this makes ${p.obj} miss lessons. You should try to pay school fees in time to help ${p.obj} concentrate.`;
    }

    // 2. Aggregate Based Comments
    if (aggregate === 0) return "Incomplete results.";
    
    // Division 1 Upper (4-8)
    if (aggregate <= 8) {
        return "Excellent performance. Keep it up!";
    }
    // Division 1 Lower (9-12)
    if (aggregate <= 12) {
        return "This is a good score. Aim for aggregate four.";
    }
    // Division 2 (13-24)
    if (aggregate <= 24) {
        return "Promising results! Work harder for a better grade.";
    }
    // Division 3 (25-28)
    if (aggregate <= 28) {
        return "This is a fair attempt! Double your effort in all areas in order to achieve more.";
    }
    // Division 4 (29-32)
    if (aggregate <= 32) {
        return "Work hard in all areas! You can make it.";
    }
    // U (33+)
    return "Your score is still low! Put in more effort in order to achieve.";
};

export const getHeadTeacherComment = (aggregate: number, student: Student): string => {
    // Headteacher usually comments on performance unless there is a major special case, 
    // but standard practice is performance based.
    
    if (aggregate === 0) return "Incomplete results.";

    if (aggregate <= 8) {
        return "This is great! Stay focused.";
    }
    if (aggregate <= 12) {
        return "Good score. Revise your books harder in order to score a super first grade.";
    }
    if (aggregate <= 24) {
        return "This is quite good, but you need to work harder for a better grade.";
    }
    if (aggregate <= 28) {
        return "Average score! Read harder and consult with your teachers in order to attain a better grade.";
    }
    if (aggregate <= 32) {
        return "Revise your books, concentrate in class, and consult with your teachers for a better performance.";
    }
    return "Work very hard in order to perform well.";
};

export const calculatePosition = (studentId: number, allClassMarks: MarkRecord[]): string => {
    if (allClassMarks.length === 0) return '-';

    const sorted = [...allClassMarks].sort((a, b) => {
        if (a.aggregate !== b.aggregate) {
            return a.aggregate - b.aggregate; 
        }
        const totalA = Object.values(a.marks).reduce((sum: number, val) => sum + (val || 0), 0);
        const totalB = Object.values(b.marks).reduce((sum: number, val) => sum + (val || 0), 0);
        return totalB - totalA; 
    });

    const index = sorted.findIndex(m => m.studentId === studentId);
    if (index === -1) return '-';

    const rank = index + 1;
    const suffix = ["th", "st", "nd", "rd"];
    const v = rank % 100;
    return rank + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
};
