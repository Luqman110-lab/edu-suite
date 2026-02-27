import { TestSession, Student, TestScore, SchoolSettings, SUBJECTS_LOWER, SUBJECTS_UPPER } from '../../../types';
import { calculateGrade } from '../../../services/grading';

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generateTestAssessmentSheet = async (
    session: TestSession,
    students: Student[],
    scores: { [studentId: number]: TestScore },
    settings: SchoolSettings,
    showMessage: (msg: string, type: 'success' | 'error' | 'info') => void
) => {
    if (!settings) {
        showMessage('Settings not loaded', 'error');
        return;
    }
    if (!session?.id) {
        showMessage('Invalid test session', 'error');
        return;
    }

    const sessionSubjects = ['P1', 'P2', 'P3'].includes(session.classLevel) ? SUBJECTS_LOWER : SUBJECTS_UPPER;

    const studentRows = students.map(student => {
        const score = scores[student.id!];
        const convertedMarks = score?.convertedMarks || {};
        let totalMarks = 0;
        sessionSubjects.forEach(sub => {
            const mark = (convertedMarks as any)[sub];
            if (mark !== undefined && mark !== null) {
                totalMarks += mark;
            }
        });
        return {
            student,
            score,
            convertedMarks,
            totalMarks,
            aggregate: score?.aggregate || 0,
            division: score?.division || ''
        };
    }).sort((a, b) => b.totalMarks - a.totalMarks);

    const studentsWithResults = studentRows.filter(r => r.totalMarks > 0);

    if (studentsWithResults.length === 0) {
        showMessage('No students have scores for this test', 'error');
        return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    const colors = {
        primary: [123, 17, 19],
        darkBlue: [30, 58, 95],
        white: [255, 255, 255],
        cream: [253, 245, 230],
        text: [51, 51, 51],
        muted: [128, 128, 128],
        border: [200, 200, 200],
        lightGray: [248, 249, 250],
        green: [34, 197, 94],
        blue: [59, 130, 246],
        red: [239, 68, 68],
        purple: [139, 92, 246]
    };

    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, pageWidth, 3, 'F');

    let headerY = 10;
    const logoSize = 16;

    if (settings.logoBase64) {
        try {
            let format = 'PNG';
            if (settings.logoBase64.startsWith('data:image/jpeg')) format = 'JPEG';
            doc.addImage(settings.logoBase64, format, pageWidth / 2 - logoSize / 2, headerY, logoSize, logoSize);
            headerY += logoSize + 2;
        } catch (e) { headerY += 2; }
    }

    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(settings.schoolName.toUpperCase(), pageWidth / 2, headerY, { align: 'center' });
    headerY += 4;

    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(settings.addressBox || '', pageWidth / 2, headerY, { align: 'center' });
    headerY += 3;

    doc.setFontSize(7);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(`Tel: ${settings.contactPhones || 'N/A'}`, pageWidth / 2, headerY, { align: 'center' });
    headerY += 3;

    if (settings.motto) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
        doc.text(`"${settings.motto}"`, pageWidth / 2, headerY, { align: 'center' });
        headerY += 2;
    }

    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(0.6);
    doc.line(margin + 40, headerY, pageWidth - margin - 40, headerY);
    headerY += 4;

    doc.setFillColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.rect(margin, headerY, pageWidth - (margin * 2), 7, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("TEST ASSESSMENT SHEET", pageWidth / 2, headerY + 5, { align: 'center' });
    headerY += 10;

    doc.setFillColor(colors.cream[0], colors.cream[1], colors.cream[2]);
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(0.2);
    doc.rect(margin, headerY, pageWidth - (margin * 2), 14, 'FD');

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

    const col1X = margin + 5;
    const col2X = margin + 80;
    const col3X = margin + 160;
    const infoY1 = headerY + 5;
    const infoY2 = headerY + 11;

    doc.setFont("helvetica", "bold");
    doc.text("Test:", col1X, infoY1);
    doc.setFont("helvetica", "normal");
    doc.text(session.name, col1X + 12, infoY1);

    doc.setFont("helvetica", "bold");
    doc.text("Class:", col2X, infoY1);
    doc.setFont("helvetica", "normal");
    doc.text(`${session.classLevel}${session.stream ? ' - ' + session.stream : ''}`, col2X + 15, infoY1);

    doc.setFont("helvetica", "bold");
    doc.text("Term:", col3X, infoY1);
    doc.setFont("helvetica", "normal");
    doc.text(`Term ${session.term}, ${session.year}`, col3X + 15, infoY1);

    doc.setFont("helvetica", "bold");
    doc.text("Type:", col1X, infoY2);
    doc.setFont("helvetica", "normal");
    doc.text(session.testType, col1X + 12, infoY2);

    doc.setFont("helvetica", "bold");
    doc.text("Date:", col2X, infoY2);
    doc.setFont("helvetica", "normal");
    doc.text(session.testDate ? new Date(session.testDate).toLocaleDateString() : '-', col2X + 15, infoY2);

    doc.setFont("helvetica", "bold");
    doc.text("Students:", col3X, infoY2);
    doc.setFont("helvetica", "normal");
    doc.text(`${studentsWithResults.length} with results`, col3X + 22, infoY2);

    headerY += 18;

    const subjectLabels: { [key: string]: string } = {
        english: 'ENG', maths: 'MTC', science: 'SCI', sst: 'SST', literacy1: 'LIT1', literacy2: 'LIT2'
    };

    const head = [[
        { content: 'POS', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white } },
        { content: 'STUDENT NAME', styles: { halign: 'left', fillColor: colors.primary, textColor: colors.white } },
        { content: 'SEX', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white } },
        ...sessionSubjects.flatMap(sub => [
            { content: subjectLabels[sub] || sub.toUpperCase(), styles: { halign: 'center', fillColor: colors.darkBlue, textColor: colors.white } },
            { content: 'GR', styles: { halign: 'center', fillColor: colors.darkBlue, textColor: [200, 200, 200], fontSize: 6 } }
        ]),
        { content: 'TOT', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold' } },
        { content: 'AGG', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold' } },
        { content: 'DIV', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold' } }
    ]];

    let currentRank = 0;
    let prevTotal = -1;

    const body = studentRows.map((row, index) => {
        if (row.totalMarks !== prevTotal && row.totalMarks > 0) {
            currentRank = index + 1;
        }
        prevTotal = row.totalMarks;

        const rowData: any[] = [
            row.totalMarks > 0 ? currentRank.toString() : '-',
            row.student.name.toUpperCase(),
            row.student.gender === 'Male' ? 'M' : row.student.gender === 'Female' ? 'F' : '-'
        ];

        sessionSubjects.forEach(sub => {
            const mark = (row.convertedMarks as any)[sub];
            const { grade } = calculateGrade(mark, settings?.gradingConfig);
            rowData.push(mark !== undefined && mark !== null ? Math.round(mark) : '-');
            rowData.push(mark !== undefined && mark !== null ? grade : '-');
        });

        rowData.push(row.totalMarks > 0 ? Math.round(row.totalMarks) : '-');
        rowData.push(row.aggregate > 0 ? row.aggregate : '-');
        rowData.push(row.aggregate > 0 ? row.division : '-');

        return rowData;
    });

    const baseColIdx = 4 + (sessionSubjects.length * 2);
    const columnStyles: any = {
        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 18, halign: 'center', fontSize: 7 },
        2: { cellWidth: 50, halign: 'left', fontStyle: 'bold' },
        3: { cellWidth: 10, halign: 'center' },
    };

    sessionSubjects.forEach((_, i) => {
        columnStyles[4 + (i * 2)] = { cellWidth: 18, halign: 'center' };
        columnStyles[4 + (i * 2) + 1] = { cellWidth: 8, halign: 'center', fontSize: 7, textColor: colors.muted };
    });

    columnStyles[baseColIdx] = { cellWidth: 14, halign: 'center', fontStyle: 'bold' };
    columnStyles[baseColIdx + 1] = { cellWidth: 12, halign: 'center', fontStyle: 'bold' };
    columnStyles[baseColIdx + 2] = { cellWidth: 12, halign: 'center', fontStyle: 'bold' };

    (doc as any).autoTable({
        startY: headerY,
        head: head,
        body: body,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 7.5,
            textColor: colors.text,
            lineColor: colors.border,
            lineWidth: 0.1,
            cellPadding: 1.2,
            valign: 'middle'
        },
        headStyles: { fontStyle: 'bold', halign: 'center', lineWidth: 0.1, lineColor: colors.white, minCellHeight: 7 },
        bodyStyles: { minCellHeight: 6 },
        alternateRowStyles: { fillColor: colors.lightGray },
        columnStyles: columnStyles,
        margin: { left: margin, right: margin },
        didParseCell: function (data: any) {
            if (data.section === 'body') {
                const colIdx = data.column.index;
                const divColIdx = baseColIdx + 2;

                if (colIdx === 0 && data.cell.raw !== '-') {
                    const rank = parseInt(data.cell.raw);
                    if (rank === 1) { data.cell.styles.textColor = [212, 175, 55]; data.cell.styles.fontStyle = 'bold'; }
                    else if (rank === 2) { data.cell.styles.textColor = [156, 163, 175]; data.cell.styles.fontStyle = 'bold'; }
                    else if (rank === 3) { data.cell.styles.textColor = [180, 83, 9]; data.cell.styles.fontStyle = 'bold'; }
                }

                if (colIdx === divColIdx) {
                    const div = data.cell.raw;
                    if (div === 'I') data.cell.styles.textColor = colors.green;
                    else if (div === 'II') data.cell.styles.textColor = colors.blue;
                    else if (div === 'III') data.cell.styles.textColor = [180, 140, 20];
                    else if (div === 'IV') data.cell.styles.textColor = colors.purple;
                    else if (div === 'U') data.cell.styles.textColor = colors.red;
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    const tableEndY = (doc as any).lastAutoTable.finalY;
    let footerY = tableEndY + 6;

    if (footerY < pageHeight - 30) {
        const divCounts = { I: 0, II: 0, III: 0, IV: 0, U: 0 };
        studentRows.forEach(r => {
            if (r.division && r.division in divCounts) {
                divCounts[r.division as keyof typeof divCounts]++;
            }
        });

        doc.setFillColor(colors.cream[0], colors.cream[1], colors.cream[2]);
        doc.rect(margin, footerY, pageWidth - (margin * 2), 10, 'F');

        doc.setFontSize(8);
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        let divX = margin + 5;
        ['I', 'II', 'III', 'IV', 'U'].forEach((div, idx) => {
            const divColors = [colors.green, colors.blue, [180, 140, 20], colors.purple, colors.red];
            doc.setTextColor(divColors[idx][0], divColors[idx][1], divColors[idx][2]);
            doc.text(`DIV ${div}: ${divCounts[div as keyof typeof divCounts]}`, divX, footerY + 6);
            divX += 35;
        });

        const passCount = divCounts.I + divCounts.II + divCounts.III + divCounts.IV;
        const passRate = studentsWithResults.length > 0 ? Math.round((passCount / studentsWithResults.length) * 100) : 0;
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.text(`Pass Rate: ${passRate}%`, pageWidth - margin - 40, footerY + 6);

        footerY += 14;
    }

    doc.setFontSize(7);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    const gradingKey = settings?.gradingConfig?.grades
        .map(g => `${g.grade} (${g.minScore}-${g.maxScore})`)
        .join(', ') || "D1 (90-100), D2 (80-89), C3 (70-79), C4 (60-69), C5 (55-59), C6 (50-54), P7 (45-49), P8 (40-44), F9 (0-39)";
    doc.text(`Grading: ${gradingKey}`, pageWidth / 2, footerY, { align: 'center' });

    doc.setFontSize(6);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, pageHeight - 4);
    doc.text(settings.schoolName, pageWidth / 2, pageHeight - 4, { align: 'center' });

    const fileName = `${settings.schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${session.name.replace(/[^a-zA-Z0-9]/g, '_')}_Assessment.pdf`;
    doc.save(fileName);
    showMessage('Assessment sheet generated successfully', 'success');
};


export const generateStudentTermReport = async (
    student: Student,
    selectedSession: TestSession,
    settings: SchoolSettings,
    showMessage: (msg: string, type: 'success' | 'error' | 'info') => void
) => {
    if (!settings) {
        showMessage('Settings not loaded', 'error');
        return;
    }

    try {
        const termTestsResponse = await fetch('/api/test-sessions', { credentials: 'include' });
        const allSessions: TestSession[] = termTestsResponse.ok ? await termTestsResponse.json() : [];

        const termSessions = allSessions.filter(s =>
            s.classLevel === student.classLevel &&
            s.term === selectedSession.term &&
            s.year === selectedSession.year &&
            (!s.stream || s.stream === student.stream)
        );

        if (termSessions.length === 0) {
            showMessage('No tests found for this student in this term', 'error');
            return;
        }

        const studentScores: { session: TestSession; score: TestScore | null }[] = [];
        for (const session of termSessions) {
            const scoresResponse = await fetch(`/api/test-scores/${session.id}`, { credentials: 'include' });
            const scores: TestScore[] = scoresResponse.ok ? await scoresResponse.json() : [];
            const studentScore = scores.find(s => s.studentId === student.id) || null;
            studentScores.push({ session, score: studentScore });
        }

        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 12;

        const colors = {
            primary: [123, 17, 19],
            darkBlue: [30, 58, 95],
            white: [255, 255, 255],
            cream: [253, 245, 230],
            text: [51, 51, 51],
            muted: [128, 128, 128],
            border: [200, 200, 200],
            lightGray: [248, 249, 250],
            green: [34, 197, 94],
            blue: [59, 130, 246],
            red: [239, 68, 68]
        };

        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(0, 0, pageWidth, 3, 'F');

        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.setLineWidth(0.3);
        doc.rect(margin - 2, 6, pageWidth - (margin * 2) + 4, pageHeight - 12, 'S');

        let headerY = 12;
        const logoSize = 18;

        if (settings.logoBase64) {
            try {
                let format = 'PNG';
                if (settings.logoBase64.startsWith('data:image/jpeg')) format = 'JPEG';
                doc.addImage(settings.logoBase64, format, pageWidth / 2 - logoSize / 2, headerY, logoSize, logoSize);
                headerY += logoSize + 3;
            } catch (e) { headerY += 2; }
        }

        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(settings.schoolName.toUpperCase(), pageWidth / 2, headerY, { align: 'center' });
        headerY += 5;

        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(settings.addressBox || '', pageWidth / 2, headerY, { align: 'center' });
        headerY += 4;

        doc.setFontSize(8);
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
        doc.text(`Tel: ${settings.contactPhones || 'N/A'}`, pageWidth / 2, headerY, { align: 'center' });
        headerY += 4;

        if (settings.motto) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
            doc.text(`"${settings.motto}"`, pageWidth / 2, headerY, { align: 'center' });
            headerY += 3;
        }

        doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setLineWidth(0.8);
        doc.line(margin + 20, headerY, pageWidth - margin - 20, headerY);
        headerY += 6;

        doc.setFillColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
        doc.rect(margin, headerY, pageWidth - (margin * 2), 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text("STUDENT TERM PROGRESS REPORT", pageWidth / 2, headerY + 5.5, { align: 'center' });
        headerY += 12;

        const infoBoxY = headerY;
        const infoBoxHeight = 18;
        doc.setFillColor(colors.cream[0], colors.cream[1], colors.cream[2]);
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.setLineWidth(0.2);
        doc.rect(margin, infoBoxY, pageWidth - (margin * 2), infoBoxHeight, 'FD');

        doc.setFontSize(9);
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

        const contentWidth = pageWidth - (margin * 2);
        const col1X = margin + 5;
        const col2X = margin + contentWidth * 0.4;
        const col3X = margin + contentWidth * 0.72;
        const infoY1 = infoBoxY + 6;
        const infoY2 = infoBoxY + 13;

        const testsWithScores = studentScores.filter(s => s.score && Object.values(s.score.convertedMarks).some(v => v !== undefined)).length;

        doc.setFont("helvetica", "bold");
        doc.text("Student: ", col1X, infoY1);
        doc.setFont("helvetica", "normal");
        doc.text(student.name.toUpperCase(), col1X + doc.getTextWidth("Student: "), infoY1);

        doc.setFont("helvetica", "bold");
        doc.text("Term: ", col2X, infoY1);
        doc.setFont("helvetica", "normal");
        doc.text(`Term ${selectedSession.term}, ${selectedSession.year}`, col2X + doc.getTextWidth("Term: "), infoY1);

        doc.setFont("helvetica", "bold");
        doc.text("Class: ", col1X, infoY2);
        doc.setFont("helvetica", "normal");
        doc.text(`${student.classLevel}${student.stream ? ' - ' + student.stream : ''}`, col1X + doc.getTextWidth("Class: "), infoY2);

        doc.setFont("helvetica", "bold");
        doc.text("Gender: ", col2X, infoY2);
        doc.setFont("helvetica", "normal");
        const g = String(student.gender || '').toLowerCase();
        const genderDisplay = g.startsWith('m') ? 'M' : g.startsWith('f') ? 'F' : (student.gender || '-');
        doc.text(genderDisplay, col2X + doc.getTextWidth("Gender: "), infoY2);

        doc.setFont("helvetica", "bold");
        doc.text("Tests Taken: ", col3X, infoY2);
        doc.setFont("helvetica", "normal");
        doc.text(`${testsWithScores} of ${termSessions.length}`, col3X + doc.getTextWidth("Tests Taken: "), infoY2);

        let y = infoBoxY + infoBoxHeight + 4;

        const sessionSubjects = ['P1', 'P2', 'P3'].includes(student.classLevel) ? SUBJECTS_LOWER : SUBJECTS_UPPER;
        const subjectLabels: { [key: string]: string } = {
            english: 'ENG', maths: 'MTC', science: 'SCI', sst: 'SST', literacy1: 'LIT1', literacy2: 'LIT2'
        };

        const head = [[
            { content: 'TEST NAME', styles: { halign: 'left', fillColor: colors.primary, textColor: colors.white } },
            { content: 'DATE', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white } },
            ...sessionSubjects.map(sub => ({
                content: subjectLabels[sub] || sub.toUpperCase(),
                styles: { halign: 'center', fillColor: colors.darkBlue, textColor: colors.white }
            })),
            { content: 'TOT', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white } },
            { content: 'AGG', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white } },
            { content: 'DIV', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white } }
        ]];

        const body = studentScores.map(({ session, score }) => {
            const rowData: any[] = [
                session.name,
                session.testDate ? new Date(session.testDate).toLocaleDateString() : '-'
            ];

            let total = 0;
            sessionSubjects.forEach(sub => {
                const mark = score ? (score.convertedMarks as any)[sub] : undefined;
                if (mark !== undefined && mark !== null) {
                    total += mark;
                    const { grade } = calculateGrade(mark, settings?.gradingConfig);
                    rowData.push(`${Math.round(mark)} (${grade})`);
                } else {
                    rowData.push('-');
                }
            });

            rowData.push(total > 0 ? Math.round(total) : '-');
            rowData.push(score?.aggregate || '-');
            rowData.push(score?.division || '-');

            return rowData;
        });

        const availableWidth = pageWidth - (margin * 2);
        const numSubjects = sessionSubjects.length;
        const fixedColsWidth = 32 + 18 + 14 + 12 + 12;
        const subjectColWidth = Math.floor((availableWidth - fixedColsWidth) / numSubjects);

        const columnStyles: any = {
            0: { cellWidth: 32, halign: 'left', fontSize: 8 },
            1: { cellWidth: 18, halign: 'center', fontSize: 7 }
        };
        sessionSubjects.forEach((_, i) => {
            columnStyles[2 + i] = { cellWidth: subjectColWidth, halign: 'center', fontSize: 7 };
        });
        const totIdx = 2 + sessionSubjects.length;
        columnStyles[totIdx] = { cellWidth: 14, halign: 'center', fontStyle: 'bold', fontSize: 8 };
        columnStyles[totIdx + 1] = { cellWidth: 12, halign: 'center', fontStyle: 'bold', fontSize: 8 };
        columnStyles[totIdx + 2] = { cellWidth: 12, halign: 'center', fontStyle: 'bold', fontSize: 8 };

        (doc as any).autoTable({
            startY: y,
            head: head,
            body: body,
            theme: 'grid',
            tableWidth: 'auto',
            styles: {
                font: 'helvetica',
                fontSize: 7,
                textColor: colors.text,
                lineColor: colors.border,
                lineWidth: 0.1,
                cellPadding: 1.5,
                valign: 'middle',
                overflow: 'ellipsize'
            },
            headStyles: { fontStyle: 'bold', halign: 'center', minCellHeight: 7, fontSize: 7 },
            bodyStyles: { minCellHeight: 6 },
            alternateRowStyles: { fillColor: colors.lightGray },
            columnStyles: columnStyles,
            margin: { left: margin, right: margin },
            didParseCell: function (data: any) {
                if (data.section === 'body') {
                    const divColIdx = totIdx + 2;
                    if (data.column.index === divColIdx) {
                        const div = data.cell.raw;
                        if (div === 'I') data.cell.styles.textColor = colors.green;
                        else if (div === 'II') data.cell.styles.textColor = colors.blue;
                        else if (div === 'III') data.cell.styles.textColor = [180, 140, 20];
                        else if (div === 'IV') data.cell.styles.textColor = [139, 92, 246];
                        else if (div === 'U') data.cell.styles.textColor = colors.red;
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });

        const tableEndY = (doc as any).lastAutoTable.finalY;
        let summaryY = tableEndY + 10;

        const validScores = studentScores.filter(s => s.score && s.score.aggregate && s.score.aggregate > 0);
        if (validScores.length > 0) {
            const avgAggregate = validScores.reduce((sum, s) => sum + (s.score?.aggregate || 0), 0) / validScores.length;
            const bestTest = validScores.reduce((best, current) =>
                (current.score?.aggregate || 99) < (best.score?.aggregate || 99) ? current : best
            );

            const subjectAverages: { [key: string]: number } = {};
            sessionSubjects.forEach(sub => {
                const marks = validScores.map(s => (s.score?.convertedMarks as any)?.[sub]).filter(m => m !== undefined);
                if (marks.length > 0) {
                    subjectAverages[sub] = marks.reduce((a, b) => a + b, 0) / marks.length;
                }
            });

            doc.setFillColor(colors.cream[0], colors.cream[1], colors.cream[2]);
            doc.rect(margin, summaryY, pageWidth - (margin * 2), 38, 'F');

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
            doc.text("TERM SUMMARY", margin + 5, summaryY + 8);

            doc.setDrawColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
            doc.setLineWidth(0.3);
            doc.line(margin + 5, summaryY + 10, margin + 50, summaryY + 10);

            doc.setFontSize(9);
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

            const labelX = margin + 8;
            const valueX = margin + 50;

            doc.setFont("helvetica", "bold");
            doc.text("Average Aggregate:", labelX, summaryY + 18);
            doc.setFont("helvetica", "normal");
            doc.text(avgAggregate.toFixed(1), valueX, summaryY + 18);

            doc.setFont("helvetica", "bold");
            doc.text("Best Performance:", labelX, summaryY + 25);
            doc.setFont("helvetica", "normal");
            doc.text(`${bestTest.session.name} (Agg: ${bestTest.score?.aggregate}, Div: ${bestTest.score?.division})`, valueX, summaryY + 25);

            doc.setFont("helvetica", "bold");
            doc.text("Subject Averages:", labelX, summaryY + 32);
            doc.setFont("helvetica", "normal");

            const subjectTexts: string[] = [];
            sessionSubjects.forEach(sub => {
                const avg = subjectAverages[sub];
                if (avg !== undefined) {
                    const { grade } = calculateGrade(avg, settings?.gradingConfig);
                    subjectTexts.push(`${subjectLabels[sub]}: ${Math.round(avg)}% (${grade})`);
                }
            });
            doc.text(subjectTexts.join('   |   '), valueX, summaryY + 32);

            summaryY += 43;
        }

        doc.setFontSize(7);
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
        const gradingKey = settings?.gradingConfig?.grades
            .map(g => `${g.grade} (${g.minScore}-${g.maxScore})`)
            .join(', ') || "D1 (90-100), D2 (80-89), C3 (70-79), C4 (60-69), C5 (55-59), C6 (50-54), P7 (45-49), P8 (40-44), F9 (0-39)";
        doc.text(`Grading Scale: ${gradingKey}`, pageWidth / 2, summaryY + 5, { align: 'center' });

        doc.setFontSize(6);
        doc.text(`Generated: ${new Date().toLocaleString()}`, margin, pageHeight - 6);
        doc.text(settings.schoolName, pageWidth / 2, pageHeight - 6, { align: 'center' });

        const fileName = `${student.name.replace(/[^a-zA-Z0-9]/g, '_')}_Term${selectedSession.term}_Progress_Report.pdf`;
        doc.save(fileName);
        showMessage('Student report generated successfully', 'success');

    } catch (err) {
        console.error('PDF generation error:', err);
        showMessage('Failed to generate student report', 'error');
    }
};
