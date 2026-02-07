
import { ClassLevel, MarkRecord, Student, GradingConfig } from "../types";

// Default configuration to use as fallback
const DEFAULT_GRADING_CONFIG: GradingConfig = {
    grades: [
        { grade: 'D1', minScore: 90, maxScore: 100, points: 1 },
        { grade: 'D2', minScore: 80, maxScore: 89, points: 2 },
        { grade: 'C3', minScore: 70, maxScore: 79, points: 3 },
        { grade: 'C4', minScore: 60, maxScore: 69, points: 4 },
        { grade: 'C5', minScore: 55, maxScore: 59, points: 5 },
        { grade: 'C6', minScore: 50, maxScore: 54, points: 6 },
        { grade: 'P7', minScore: 45, maxScore: 49, points: 7 },
        { grade: 'P8', minScore: 40, maxScore: 44, points: 8 },
        { grade: 'F9', minScore: 0, maxScore: 39, points: 9 },
    ],
    divisions: [
        { division: 'I', minAggregate: 4, maxAggregate: 12 },
        { division: 'II', minAggregate: 13, maxAggregate: 24 },
        { division: 'III', minAggregate: 25, maxAggregate: 28 },
        { division: 'IV', minAggregate: 29, maxAggregate: 32 },
        { division: 'U', minAggregate: 33, maxAggregate: 36 },
    ],
    passingMark: 40,
};

export const calculateGrade = (mark: number | undefined, config?: GradingConfig): { grade: string; points: number } => {
    if (mark === undefined || mark === null) return { grade: '-', points: 0 };

    const currentConfig = config || DEFAULT_GRADING_CONFIG;
    const gradeDefinition = currentConfig.grades.find(g => mark >= g.minScore && mark <= g.maxScore);

    if (gradeDefinition) {
        return { grade: gradeDefinition.grade, points: gradeDefinition.points };
    }

    // Fallback for out of range or undefined grades in config (though default should cover it)
    return { grade: 'F9', points: 9 };
};

export const calculateAggregate = (marks: { [key: string]: number | undefined }, classLevel: ClassLevel, config?: GradingConfig): number => {
    const isUpper = ['P4', 'P5', 'P6', 'P7'].includes(classLevel);
    const subjects = isUpper
        ? ['english', 'maths', 'science', 'sst']
        : ['english', 'maths', 'literacy1', 'literacy2'];

    let totalPoints = 0;
    let completedSubjects = 0;

    subjects.forEach(sub => {
        const mark = marks[sub];
        if (mark !== undefined && mark !== null) {
            totalPoints += calculateGrade(mark, config).points;
            completedSubjects++;
        }
    });

    return completedSubjects === 4 ? totalPoints : 0;
};

export const calculateDivision = (aggregate: number, classLevel: ClassLevel, config?: GradingConfig): string => {
    if (aggregate === 0) return '-';

    const currentConfig = config || DEFAULT_GRADING_CONFIG;
    const divisionDefinition = currentConfig.divisions.find(d => aggregate >= d.minAggregate && aggregate <= d.maxAggregate);

    if (divisionDefinition) {
        return divisionDefinition.division;
    }

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

const getPronouns = (gender: string) => {
    return {
        sub: gender === 'F' ? 'She' : 'He',
        obj: gender === 'F' ? 'her' : 'him',
        pos: gender === 'F' ? 'her' : 'his',
        sub_lower: gender === 'F' ? 'she' : 'he'
    };
};

export const getClassTeacherComment = (division: string, student: Student): string => {
    const p = getPronouns(student.gender);
    const name = student.name.split(' ')[0] || 'Learner'; // Use first name

    // 1. Check Special Cases first
    if (student.specialCases?.absenteeism) {
        return `${name} has underperformed due to absenteeism. ${p.sub} should try to be present throughout the term in order to perform better than this.`;
    }
    if (student.specialCases?.sickness) {
        return `${name} has been affected by sickness this term. ${p.sub} can perform better than this.`;
    }
    if (student.specialCases?.fees) {
        return `${name} is often sent home for school fees and this makes ${p.obj} miss lessons. You should try to pay school fees in time to help ${p.obj} concentrate.`;
    }

    // 2. Division Based Comments
    if (division === '-' || division === 'X') return "Incomplete results.";

    if (division === 'I') {
        return "Excellent performance. Keep it up!";
    }
    if (division === 'II') {
        return "Promising results! Work harder for a better grade.";
    }
    if (division === 'III') {
        return "This is a fair attempt! Double your effort in all areas in order to achieve more.";
    }
    if (division === 'IV') {
        return "Work hard in all areas! You can make it.";
    }
    // U or others
    return "Your score is still low! Put in more effort in order to achieve.";
};

export const getHeadTeacherComment = (division: string, student: Student): string => {
    if (division === '-' || division === 'X') return "Incomplete results.";

    if (division === 'I') {
        return "This is great! Stay focused.";
    }
    if (division === 'II') {
        return "This is quite good, but you need to work harder for a better grade.";
    }
    if (division === 'III') {
        return "Average score! Read harder and consult with your teachers in order to attain a better grade.";
    }
    if (division === 'IV') {
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
