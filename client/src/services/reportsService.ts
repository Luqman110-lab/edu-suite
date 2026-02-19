import { Student, MarkRecord, AssessmentType, ClassLevel, SchoolSettings, ApiTeacher, SUBJECTS_LOWER, SUBJECTS_UPPER } from '../../../types';
import { calculateGrade, getComment, getClassTeacherComment, getHeadTeacherComment } from '../../grading';
import * as XLSX from 'xlsx';

declare const jspdf: any;

export const calculateTotalMarks = (record: MarkRecord, subjects: string[]): number => {
    if (!record || !record.marks) return 0;
    let total = 0;
    subjects.forEach(sub => {
        const mark = (record.marks as any)[sub];
        if (mark !== undefined && mark !== null && typeof mark === 'number') {
            total += mark;
        }
    });
    return total;
};

export const calculatePositionFromMarks = (studentId: number, marks: MarkRecord[], classLevel: ClassLevel): string => {
    const studentRecord = marks.find(m => m.studentId === studentId);
    if (!studentRecord || !studentRecord.marks) {
        return '-';
    }

    const subjects = ['P1', 'P2', 'P3'].includes(classLevel)
        ? SUBJECTS_LOWER
        : SUBJECTS_UPPER;

    const studentTotal = calculateTotalMarks(studentRecord, subjects);
    if (studentTotal === 0) return '-';

    const studentsWithTotals = marks
        .filter(m => m.marks && Object.keys(m.marks).length > 0)
        .map(m => ({
            studentId: m.studentId,
            totalMarks: calculateTotalMarks(m, subjects)
        }))
        .filter(s => s.totalMarks > 0)
        .sort((a, b) => b.totalMarks - a.totalMarks);

    let position = 1;
    let prevTotal = -1;
    for (let i = 0; i < studentsWithTotals.length; i++) {
        if (studentsWithTotals[i].totalMarks !== prevTotal) {
            position = i + 1;
        }
        prevTotal = studentsWithTotals[i].totalMarks;

        if (studentsWithTotals[i].studentId === studentId) {
            break;
        }
    }

    if (position <= 0) return '-';

    const lastDigit = position % 10;
    const lastTwoDigits = position % 100;
    let suffix: string;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
        suffix = 'th';
    } else if (lastDigit === 1) {
        suffix = 'st';
    } else if (lastDigit === 2) {
        suffix = 'nd';
    } else if (lastDigit === 3) {
        suffix = 'rd';
    } else {
        suffix = 'th';
    }

    return `${position}${suffix}`;
};

export const findSubjectTeacher = (teachers: ApiTeacher[], subject: string, classLevel: string, studentStream?: string): string => {
    const subjectAliases: { [key: string]: string[] } = {
        'english': ['english', 'eng', 'engl'],
        'maths': ['maths', 'math', 'mathematics', 'mtc'],
        'science': ['science', 'sci', 'scn'],
        'sst': ['sst', 'social studies', 'social', 'socialstudies'],
        'literacy1': ['literacy1', 'literacy 1', 'lit1', 'lit 1', 'reading'],
        'literacy2': ['literacy2', 'literacy 2', 'lit2', 'lit 2', 'writing']
    };

    const subjectLower = subject.toLowerCase().trim();
    const possibleNames = subjectAliases[subjectLower] || [subjectLower];

    const classStreamCombo = studentStream ? `${classLevel}-${studentStream}`.toUpperCase() : classLevel.toUpperCase();
    const classLevelUpper = classLevel.toUpperCase();
    const studentStreamUpper = studentStream?.toUpperCase();

    const teacher = teachers.find(t => {
        const isSubjectTeacher = t.roles && t.roles.some(role =>
            role.toLowerCase().includes('subject') ||
            role.toLowerCase() === 'subject teacher'
        );
        if (!isSubjectTeacher) return false;

        const teacherSubjects = t.subjects || [];
        const teachesSubject = teacherSubjects.some(teacherSubject => {
            const teacherSubjectLower = (teacherSubject || '').toLowerCase().trim();
            return possibleNames.some(alias =>
                teacherSubjectLower === alias ||
                teacherSubjectLower.includes(alias) ||
                alias.includes(teacherSubjectLower)
            );
        });
        if (!teachesSubject) return false;

        const teachingClasses = t.teachingClasses || [];
        if (teachingClasses.length > 0) {
            const matchesTeachingClass = teachingClasses.some(tc => {
                const tcUpper = (tc || '').toUpperCase().trim();
                if (tcUpper === classStreamCombo) return true;
                if (tcUpper === classLevelUpper) return true;
                if (tcUpper.includes('-')) {
                    const [cls, stream] = tcUpper.split('-');
                    if (cls === classLevelUpper && (!studentStreamUpper || stream === studentStreamUpper)) {
                        return true;
                    }
                }
                return false;
            });
            if (matchesTeachingClass) return true;
        }

        if (t.assignedClass) {
            const assignedClassUpper = t.assignedClass.toUpperCase();
            const assignedStreamUpper = (t.assignedStream || '').toUpperCase();
            if (assignedClassUpper === classLevelUpper) {
                if (!studentStreamUpper || !assignedStreamUpper || assignedStreamUpper === studentStreamUpper) {
                    return true;
                }
            }
        }

        return false;
    });

    return teacher ? teacher.name : "";
};

export const generatePDF = async (
    students: Student[],
    allMarks: MarkRecord[],
    allTeachers: ApiTeacher[],
    settings: SchoolSettings,
    selectedClass: ClassLevel,
    selectedTerm: number,
    reportType: AssessmentType,
    selectedStream: string,
    showMessage: (msg: string, type: 'success' | 'error' | 'info') => void
) => {
    if (!settings) {
        showMessage("Settings not loaded", 'error');
        return;
    }

    const year = settings.currentYear || new Date().getFullYear();
    const subjects = ['P1', 'P2', 'P3'].includes(selectedClass) ? SUBJECTS_LOWER : SUBJECTS_UPPER;

    // Filter marks for the whole class for position calculation
    const wholeClassStudents = students; // Assuming passed students list is already filtered by class? 
    // Wait, passed students might be just the selected ones. We need class marks context.
    // The original function accesses 'allMarks' and 'wholeClassStudents' from closure.
    // We should pass 'allMarks' (which are all marks for the school/year) and filter inside.

    const wholeClassMarks = allMarks; // We need to filter these.
    // Actually, calculatePositionFromMarks requires array of marks.

    // Let's optimize: pre-calculate class marks.
    const classBotMarks = allMarks.filter(m =>
        m.term === selectedTerm &&
        m.year === year &&
        m.type === AssessmentType.BOT
        // We need to check if student is in this class? 
        // In the original code, it filtered by student ID present in wholeClassStudents list.
        // We can trust the passed 'students' array contains the students we are generating for, 
        // but for position we need ALL students in the class, not just selected ones.
        // So we might need to pass all students in the class too? 
        // Or we assume `allMarks` has marks for everyone and `calculatePositionFromMarks` just needs marks.
        // `calculatePositionFromMarks` filters by the array passed to it.
    );

    const classEotMarks = allMarks.filter(m =>
        m.term === selectedTerm &&
        m.year === year &&
        m.type === AssessmentType.EOT
    );

    // We need to filter marks only for the current classLevel to represent "Class Position" correctly.
    // But `calculatePositionFromMarks` filters nothing, it just sorts the array passed.
    // So we must pass only marks for the relevant class/stream.

    // If position is per stream:
    // Original code: `calculatePositionFromMarks(student.id!, classBotMarks, selectedClass)`
    // `classBotMarks` was filtered by `wholeClassStudents`.

    // So we need to ensure we have context of the whole class's marks, even if generating for 1 student.
    // I'll assume `students` passed here are the ones TO GENERATE. 
    // But we need a separate `classMarks` or similar. 

    // Refactoring strategy: Pass `classBotMarks` and `classEotMarks` pre-filtered by the caller?
    // That's cleaner.
};

// Re-defining with cleaner signature
interface ReportGenerationParams {
    selectedStudents: Student[];
    classBotMarks: MarkRecord[];
    classEotMarks: MarkRecord[];
    allTeachers: ApiTeacher[];
    settings: SchoolSettings;
    selectedClass: ClassLevel;
    selectedTerm: number;
    reportType: AssessmentType;
    selectedStream: string;
    showMessage: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const generateReportsPDF = async ({
    selectedStudents,
    classBotMarks,
    classEotMarks,
    allTeachers,
    settings,
    selectedClass,
    selectedTerm,
    reportType,
    selectedStream,
    showMessage
}: ReportGenerationParams) => {

    const doc = new jspdf.jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const year = settings.currentYear || new Date().getFullYear();

    // Define Colors - Brand Colors (Maroon and Navy)
    const primaryColor = [123, 17, 19]; // Maroon #7B1113
    const darkBlue = [30, 58, 95]; // Navy #1E3A5F
    const lightBg = [253, 248, 248]; // Light maroon tint background
    const greenColor = [21, 128, 61]; // Green for good grades
    const amberColor = [180, 83, 9]; // Amber for okay grades  
    const redColor = [185, 28, 28]; // Red for poor grades

    for (let i = 0; i < selectedStudents.length; i++) {
        const student = selectedStudents[i];
        if (i > 0) doc.addPage();

        const botRecord = classBotMarks.find(m => m.studentId === student.id);
        const eotRecord = classEotMarks.find(m => m.studentId === student.id);

        const botPos = calculatePositionFromMarks(student.id!, classBotMarks, selectedClass);
        const eotPos = calculatePositionFromMarks(student.id!, classEotMarks, selectedClass);

        const isBotReport = reportType === AssessmentType.BOT;
        const mainRecord = isBotReport ? botRecord : eotRecord;
        const mainAgg = mainRecord ? mainRecord.aggregate : 0;

        const studentForComment = {
            ...student,
            classLevel: student.classLevel as any,
            gender: student.gender as any,
            specialCases: student.specialCases || { absenteeism: false, sickness: false, fees: false }
        };
        const ctComment = getClassTeacherComment(mainRecord?.division || 'U', studentForComment);
        const htComment = getHeadTeacherComment(mainRecord?.division || 'U', studentForComment);

        const classTeacher = allTeachers.find(t => t.roles.includes('Class Teacher') && t.assignedClass === selectedClass && t.assignedStream === student.stream);
        const headTeacher = allTeachers.find(t => t.roles.includes('Headteacher'));
        const headTeacherName = headTeacher ? headTeacher.name : "Head Teacher";
        const classTeacherName = classTeacher ? classTeacher.name : "Class Teacher";

        const textCenterX = pageWidth / 2;
        let cursorY = 15;

        // ================= DECORATIVE BORDER =================
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(1.5);
        doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
        doc.setDrawColor(darkBlue[0], darkBlue[1], darkBlue[2]);
        doc.setLineWidth(0.5);
        doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

        // ================= HEADER =================
        const logoSize = 20;

        if (settings.logoBase64) {
            try {
                const logoData = settings.logoBase64;
                let format = 'PNG';
                if (logoData.startsWith('data:image/jpeg') || logoData.startsWith('data:image/jpg')) format = 'JPEG';
                doc.addImage(logoData, format, margin, cursorY - 5, logoSize, logoSize);
            } catch (e) { }
        }

        // ================= STUDENT PHOTO =================
        if (student.photoBase64) {
            try {
                const photoData = student.photoBase64;
                let format = 'PNG';
                if (photoData.startsWith('data:image/jpeg') || photoData.startsWith('data:image/jpg')) format = 'JPEG';
                // Place on top right, mirroring the logo
                const photoX = pageWidth - margin - logoSize;
                doc.addImage(photoData, format, photoX, cursorY - 5, logoSize, logoSize);
            } catch (e) { }
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
        doc.text(settings.schoolName, textCenterX, cursorY, { align: "center" });

        cursorY += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(settings.addressBox || '', textCenterX, cursorY, { align: "center" });

        cursorY += 4;
        doc.text(settings.contactPhones || '', textCenterX, cursorY, { align: "center" });

        cursorY += 8;
        const termText = selectedTerm === 1 ? "ONE" : selectedTerm === 2 ? "TWO" : "THREE";
        const reportTitle = isBotReport
            ? `BEGINNING OF TERM ${termText} REPORT ${year}`
            : `END OF TERM ${termText} REPORT ${year}`;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(reportTitle, textCenterX, cursorY, { align: "center" });

        // ================= STUDENT INFO BOX =================
        cursorY += 8;

        // Draw student info box with light background
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, cursorY - 4, pageWidth - margin * 2, 28, 2, 2, 'FD');

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);

        const col1X = margin + 3;
        const col2X = 70;
        const col3X = 130;

        // Row 1
        doc.setFont("helvetica", "bold");
        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
        doc.text("NAME:", col1X, cursorY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(student.name.toUpperCase(), col1X + 14, cursorY);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
        doc.text("GENDER:", col2X, cursorY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(student.gender === 'M' ? 'Male' : 'Female', col2X + 18, cursorY);

        // Row 2
        cursorY += 6;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
        doc.text("CLASS:", col1X, cursorY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(student.classLevel, col1X + 14, cursorY); // Simplified displayName

        doc.setFont("helvetica", "bold");
        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
        doc.text("STREAM:", col2X, cursorY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(student.stream || '-', col2X + 18, cursorY);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
        doc.text("PAYCODE:", col3X, cursorY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(student.paycode || 'N/A', col3X + 20, cursorY);

        // Row 3
        cursorY += 6;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
        doc.text("TERM:", col1X, cursorY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(termText, col1X + 12, cursorY);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
        doc.text("YEAR:", col2X, cursorY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(String(year), col2X + 12, cursorY);

        // Parent info
        const parentName = student.parentName || '-';
        const parentContact = student.parentContact || '-';
        doc.setFont("helvetica", "bold");
        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
        doc.text("PARENT:", col3X, cursorY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(parentName.substring(0, 20), col3X + 16, cursorY);

        // Row 4 - Parent contact
        cursorY += 6;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
        doc.text("PARENT CONTACT:", col1X, cursorY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(parentContact, col1X + 35, cursorY);

        cursorY += 10;
        const subjects = ['P1', 'P2', 'P3'].includes(selectedClass) ? SUBJECTS_LOWER : SUBJECTS_UPPER;

        const drawAssessmentTable = (startY: number, title: string, record: any, position: string) => {
            // Section title with colored background
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(margin, startY - 4, pageWidth - margin * 2, 7, 'F');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(255, 255, 255);
            doc.text(title, textCenterX, startY, { align: "center" });

            const tableWidth = pageWidth - margin * 2;
            const colWidths = { subject: 30, marks: 16, grade: 16, comment: 55, teacher: 25 };
            const tableStartX = margin;
            // Calculate teacher column X to fit within table bounds
            const teacherColX = pageWidth - margin - colWidths.teacher;
            let tableY = startY + 7;

            // Table header with light background
            doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
            doc.rect(margin, tableY - 3, pageWidth - margin * 2, 6, 'F');

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
            doc.text("SUBJECT", tableStartX, tableY);
            doc.text("MARKS", tableStartX + colWidths.subject + 5, tableY);
            doc.text("GRADE", tableStartX + colWidths.subject + colWidths.marks + 10, tableY);
            doc.text("COMMENT", tableStartX + colWidths.subject + colWidths.marks + colWidths.grade + 15, tableY);
            doc.text("TEACHER", teacherColX, tableY);

            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setLineWidth(0.5);
            tableY += 2;
            doc.line(tableStartX, tableY, pageWidth - margin, tableY);

            tableY += 5;
            doc.setFont("helvetica", "normal");
            doc.setTextColor(0, 0, 0);

            subjects.forEach((sub, idx) => {
                const mark = record?.marks ? (record.marks as any)[sub] : undefined;
                const { grade } = calculateGrade(mark, settings?.gradingConfig);
                const teacherName = findSubjectTeacher(allTeachers, sub, selectedClass, student.stream);
                // Get last name, handling trailing spaces
                const nameParts = teacherName.trim().split(/\s+/).filter(p => p.length > 0);
                const displayTeacher = nameParts.length > 0 ? nameParts[nameParts.length - 1] : '';

                let displaySubject = sub.toUpperCase();
                if (sub === 'english') displaySubject = 'ENGLISH';
                if (sub === 'maths') displaySubject = 'MATHS';
                if (sub === 'science') displaySubject = 'SCIENCE';
                if (sub === 'sst') displaySubject = 'SST';
                if (sub === 'literacy1') displaySubject = 'LITERACY 1';
                if (sub === 'literacy2') displaySubject = 'LITERACY 2';

                // Alternate row background
                if (idx % 2 === 1) {
                    doc.setFillColor(252, 252, 253);
                    doc.rect(margin, tableY - 4, pageWidth - margin * 2, 7, 'F');
                }

                doc.setTextColor(0, 0, 0);
                doc.text(displaySubject, tableStartX, tableY);

                // Color code marks
                if (mark !== undefined) {
                    if (mark >= 80) {
                        doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
                    } else if (mark < 40) {
                        doc.setTextColor(redColor[0], redColor[1], redColor[2]);
                    } else {
                        doc.setTextColor(0, 0, 0);
                    }
                    doc.text(String(mark), tableStartX + colWidths.subject + 10, tableY, { align: 'center' });
                }

                // Color code grades
                if (grade !== '-') {
                    if (grade === 'D1' || grade === 'D2') {
                        doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
                    } else if (['C3', 'C4', 'C5', 'C6'].includes(grade)) {
                        doc.setTextColor(amberColor[0], amberColor[1], amberColor[2]);
                    } else if (['P7', 'P8', 'F9'].includes(grade)) {
                        doc.setTextColor(redColor[0], redColor[1], redColor[2]);
                    }
                    doc.text(grade, tableStartX + colWidths.subject + colWidths.marks + 15, tableY, { align: 'center' });
                }

                doc.setTextColor(0, 0, 0);
                doc.text(mark !== undefined ? getComment(sub, mark) : '', tableStartX + colWidths.subject + colWidths.marks + colWidths.grade + 15, tableY);
                // Width-aware truncation for teacher name to fit column
                let truncatedTeacher = displayTeacher;
                const maxWidth = colWidths.teacher - 2; // Leave small padding
                while (truncatedTeacher.length > 0 && doc.getTextWidth(truncatedTeacher) > maxWidth) {
                    truncatedTeacher = truncatedTeacher.substring(0, truncatedTeacher.length - 1);
                }
                if (truncatedTeacher.length < displayTeacher.length && truncatedTeacher.length > 1) {
                    truncatedTeacher = truncatedTeacher.substring(0, truncatedTeacher.length - 1) + '.';
                }
                doc.text(truncatedTeacher || '', teacherColX, tableY);

                tableY += 7;
            });

            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setLineWidth(0.5);
            doc.line(tableStartX, tableY - 3, pageWidth - margin, tableY - 3);

            const agg = record ? record.aggregate : '';
            const div = record ? record.division : '';

            // Summary row with colored background
            doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2]);
            doc.rect(margin, tableY - 1, pageWidth - margin * 2, 7, 'F');

            tableY += 3;
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.text(`TOTAL AGGREGATE: ${agg}`, tableStartX + 5, tableY);
            doc.text(`DIVISION: ${div}`, textCenterX, tableY, { align: 'center' });
            doc.text(`CLASS POSN: ${position}`, pageWidth - margin - 35, tableY);

            return tableY + 10;
        };

        if (isBotReport || (!isBotReport && botRecord)) {
            cursorY = drawAssessmentTable(cursorY, "BEGINNING OF TERM", botRecord, botPos);
        }

        if (!isBotReport) {
            cursorY = drawAssessmentTable(cursorY, "END OF TERM", eotRecord, eotPos);
        }

        // ================= COMMENTS SECTION =================
        cursorY += 3;

        // Comments header
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(margin, cursorY - 4, pageWidth - margin * 2, 7, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text("COMMENTS", textCenterX, cursorY, { align: "center" });

        cursorY += 10;

        // Class Teacher Comment Box
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.2);
        doc.roundedRect(margin, cursorY - 4, pageWidth - margin * 2, 18, 1, 1, 'FD');

        // Class Teacher label and name on same line
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("CLASS TEACHER:", margin + 2, cursorY);

        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
        doc.text(classTeacherName ? classTeacherName.toUpperCase() : '', margin + 32, cursorY);

        // Signature line
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.1);
        doc.line(pageWidth - margin - 45, cursorY, pageWidth - margin - 5, cursorY);
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text("Signature", pageWidth - margin - 30, cursorY + 3, { align: "center" });

        // Comment text
        cursorY += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        const ctLines = doc.splitTextToSize(ctComment, pageWidth - margin * 2 - 10);
        doc.text(ctLines, margin + 2, cursorY);

        cursorY += 16;

        // Head Teacher Comment Box
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.2);
        doc.roundedRect(margin, cursorY - 4, pageWidth - margin * 2, 18, 1, 1, 'FD');

        // Head Teacher label and name on same line
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("HEAD TEACHER:", margin + 2, cursorY);

        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
        doc.text(headTeacherName.toUpperCase(), margin + 30, cursorY);

        // Signature line
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.1);
        doc.line(pageWidth - margin - 45, cursorY, pageWidth - margin - 5, cursorY);
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text("Signature", pageWidth - margin - 30, cursorY + 3, { align: "center" });

        // Comment text
        cursorY += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        const htLines = doc.splitTextToSize(htComment, pageWidth - margin * 2 - 10);
        doc.text(htLines, margin + 2, cursorY);

        // ================= GRADING KEY =================
        const keyY = pageHeight - 58;
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.2);
        doc.roundedRect(margin, keyY - 3, pageWidth - margin * 2, 12, 1, 1, 'FD');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
        doc.text("GRADING KEY:", margin + 2, keyY + 2);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const gradingKey = settings?.gradingConfig?.grades
            .map(g => `${g.grade} (${g.minScore}-${g.maxScore})`)
            .join(' | ') || "D1 (90-100) | D2 (80-89) | C3 (70-79) | C4 (60-69) | C5 (55-59) | C6 (50-54) | P7 (45-49) | P8 (40-44) | F9 (0-39)";
        doc.text(gradingKey, margin + 28, keyY + 2);

        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
        doc.text("DIVISIONS:", margin + 2, keyY + 7);
        doc.setTextColor(0, 0, 0);

        const divisionKey = settings?.gradingConfig?.divisions
            .map(d => `${d.division} (${d.minAggregate}-${d.maxAggregate})`)
            .join(' | ') || "I (4-12) | II (13-24) | III (25-28) | IV (29-32) | U (33-36)";
        doc.text(divisionKey, margin + 22, keyY + 7);

        // ================= FOOTER =================
        const footerY = pageHeight - 42;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);

        const boardersDate = settings.nextTermBeginBoarders || 'TBA';
        const dayDate = settings.nextTermBeginDay || 'TBA';
        doc.text(`NEXT TERM STARTS ON:        BOARDERS: ${boardersDate}          DAY LEARNERS: ${dayDate}`, textCenterX, footerY, { align: "center" });

        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, footerY + 4, pageWidth - margin, footerY + 4);

        doc.setFontSize(8);
        // Use school address instead of hardcoded location
        const schoolLocation = settings.addressBox || '';
        if (schoolLocation) {
            doc.text(schoolLocation.toUpperCase(), textCenterX, footerY + 10, { align: "center" });
        }

        const regInfo = [];
        if (settings.regNumber) regInfo.push(`REG NO: ${settings.regNumber}`);
        if (settings.centreNumber) regInfo.push(`CENTRE NO: ${settings.centreNumber}`);
        doc.text(regInfo.join(' | '), textCenterX, footerY + 15, { align: "center" });

        doc.setLineWidth(0.5);
        doc.line(margin, footerY + 19, pageWidth - margin, footerY + 19);

        if (settings.motto) {
            doc.setFont("helvetica", "bolditalic");
            doc.setFontSize(10);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text(`"${settings.motto}"`, textCenterX, footerY + 26, { align: "center" });
        }
    }

    // Use school name in filename (sanitized)
    const safeSchoolName = settings.schoolName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    doc.save(`${safeSchoolName}_Report_${selectedClass}_${selectedStream}_Term${selectedTerm}.pdf`);
    showMessage("PDF Generated Successfully", 'success');
};


export const exportReportsToExcel = (
    previews: any[], // Type properly in real code
    selectedClass: ClassLevel,
    selectedTerm: number,
    selectedStream: string,
    reportType: AssessmentType,
    settings: SchoolSettings,
    showMessage: (msg: string, type: 'success' | 'error' | 'info') => void
) => {
    if (previews.length === 0) {
        showMessage('No student data to export', 'error');
        return;
    }

    const subjects = ['P1', 'P2', 'P3'].includes(selectedClass) ? SUBJECTS_LOWER : SUBJECTS_UPPER;
    const year = settings?.currentYear || new Date().getFullYear();
    const isBotReport = reportType === AssessmentType.BOT;

    // Prepare data for Excel
    const excelData = previews.map((preview, index) => {
        const student = preview.student;
        const currentRecord = isBotReport ? preview.botMarks : preview.eotMarks;
        const currentPosition = isBotReport ? preview.botPosition : preview.eotPosition;

        const row: any = {
            '#': index + 1,
            'Student Name': student.name,
            'Gender': student.gender === 'M' ? 'Male' : 'Female',
            'Class': student.classLevel,
            'Stream': student.stream || '-',
        };

        // Add subject marks and grades
        subjects.forEach(sub => {
            const mark = currentRecord?.marks ? (currentRecord.marks as any)[sub] : undefined;
            const { grade } = calculateGrade(mark, settings?.gradingConfig);
            const displaySubject = sub.toUpperCase();
            row[`${displaySubject} Mark`] = mark !== undefined ? mark : '-';
            row[`${displaySubject} Grade`] = grade;
        });

        // Add aggregate, division, position
        row['Aggregate'] = currentRecord?.aggregate || '-';
        row['Division'] = currentRecord?.division || '-';
        row['Position'] = currentPosition;

        // Add comments if available
        if (currentRecord?.division) {
            const studentForComment = {
                ...student,
                classLevel: student.classLevel as any,
                gender: student.gender as any,
                specialCases: student.specialCases || { absenteeism: false, sickness: false, fees: false }
            };
            row['Class Teacher Comment'] = getClassTeacherComment(currentRecord.division, studentForComment);
            row['Head Teacher Comment'] = getHeadTeacherComment(currentRecord.division, studentForComment);
        }

        return row;
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
        { wch: 5 },  // #
        { wch: 30 }, // Name
        { wch: 15 }, // Index
        { wch: 10 }, // Gender
        { wch: 10 }, // Class
        { wch: 12 }, // Stream
    ];
    subjects.forEach(() => {
        colWidths.push({ wch: 10 }); // Mark
        colWidths.push({ wch: 8 });  // Grade
    });
    colWidths.push({ wch: 10 }); // Aggregate
    colWidths.push({ wch: 10 }); // Division
    colWidths.push({ wch: 10 }); // Position
    colWidths.push({ wch: 50 }); // CT Comment
    colWidths.push({ wch: 50 }); // HT Comment
    ws['!cols'] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    const sheetName = `${selectedClass}_Term${selectedTerm}_${isBotReport ? 'BOT' : 'EOT'}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate filename
    const fileName = `Report_Cards_${selectedClass}_${selectedStream !== 'All' ? selectedStream + '_' : ''}Term${selectedTerm}_${year}_${isBotReport ? 'BOT' : 'EOT'}.xlsx`;

    // Save file
    XLSX.writeFile(wb, fileName);
    showMessage('Exported to Excel successfully', 'success');
};


export const exportReportsToCSV = (
    previews: any[],
    selectedClass: ClassLevel,
    selectedTerm: number,
    selectedStream: string,
    reportType: AssessmentType,
    allMarks: MarkRecord[],
    settings: SchoolSettings,
    showMessage: (msg: string, type: 'success' | 'error' | 'info') => void
) => {
    if (!previews || previews.length === 0) {
        showMessage('No student data to export', 'error');
        return;
    }

    const subjects = ['P1', 'P2', 'P3'].includes(selectedClass) ? SUBJECTS_LOWER : SUBJECTS_UPPER;
    const year = settings?.currentYear || new Date().getFullYear();
    const isBotReport = reportType === AssessmentType.BOT;
    const currentMarks = isBotReport
        ? (allMarks || []).filter(m => m.type === AssessmentType.BOT && m.term === selectedTerm && m.year === year)
        : (allMarks || []).filter(m => m.type === AssessmentType.EOT && m.term === selectedTerm && m.year === year);

    const headers = [
        'Student Name', 'Gender', 'Class', 'Stream',
        ...subjects.map(s => `${s}_Mark`),
        ...subjects.map(s => `${s}_Grade`),
        'Aggregate', 'Division', 'Position',
        'Class Teacher Comment', 'Head Teacher Comment'
    ];

    const rows = previews.map(preview => {
        const student = preview.student;
        const markRecord = currentMarks.find(m => m.studentId === student.id);
        const position = isBotReport ? preview.botPosition : preview.eotPosition;

        const studentForComment = {
            ...student,
            classLevel: student.classLevel as any,
            gender: student.gender as any,
            specialCases: student.specialCases || { absenteeism: false, sickness: false, fees: false }
        };

        const ctComment = getClassTeacherComment(markRecord?.division || 'U', studentForComment);
        const htComment = getHeadTeacherComment(markRecord?.division || 'U', studentForComment);

        return [
            student.name, student.gender, student.classLevel, student.stream || '',
            ...subjects.map(s => markRecord?.marks?.[s] ?? ''),
            ...subjects.map(s => {
                const mark = markRecord?.marks?.[s];
                return mark !== undefined ? calculateGrade(mark).grade : '';
            }),
            markRecord?.aggregate || '', markRecord?.division || '', position,
            `"${ctComment.replace(/"/g, '""')}"`, `"${htComment.replace(/"/g, '""')}"`
        ];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileName = `Report_Cards_${selectedClass}_${selectedStream !== 'All' ? selectedStream + '_' : ''}Term${selectedTerm}_${year}_${isBotReport ? 'BOT' : 'EOT'}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMessage('Exported to CSV successfully', 'success');
};
