import { AssessmentType, SchoolSettings, ApiTeacher, ClassLevel, SUBJECTS_UPPER, SUBJECTS_LOWER } from '../../../types';
import { calculateGrade } from '../../grading';
import { getDisplayName } from '../../hooks/use-class-names-logic'; // We might need to duplicate this or import logic

declare const jspdf: any;

const subjectShortNames: { [key: string]: string } = {
    'english': 'ENG',
    'maths': 'MTC',
    'science': 'SCI',
    'sst': 'SST',
    'literacy1': 'LIT1',
    'literacy2': 'LIT2'
};

export const downloadAssessmentCSV = (
    filteredData: any[],
    subjects: string[],
    selectedClass: ClassLevel,
    selectedStream: string,
    selectedTerm: number,
    selectedType: AssessmentType | 'BOTH'
) => {
    const data = filteredData;
    const header = ['Rank', 'Name', 'Stream', 'Gender', ...subjects.map(s => subjectShortNames[s]), 'Total', 'Agg', 'Div'];

    const sortedData = [...data].sort((a, b) => {
        if (a.aggregate === 0 && b.aggregate > 0) return 1;
        if (b.aggregate === 0 && a.aggregate > 0) return -1;
        if (a.aggregate !== b.aggregate) return a.aggregate - b.aggregate;
        return b.totalMarks - a.totalMarks;
    });

    const rows = sortedData.map((row, idx) => [
        idx + 1,
        row.student.name,
        row.student.stream,
        row.student.gender,
        ...subjects.map(s => (row.marks as any)[s] || ''),
        row.totalMarks,
        row.aggregate,
        row.division
    ]);

    const csvContent = [
        header.join(','),
        ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const streamSuffix = selectedStream !== 'ALL' ? `_${selectedStream}` : '';
    link.download = `${selectedClass}${streamSuffix}_Assessment_Term${selectedTerm}_${selectedType}.csv`;
    link.click();
};

const generateSection = (
    doc: any,
    type: AssessmentType,
    classStudents: any[],
    allMarks: any[],
    settings: SchoolSettings,
    year: number,
    streamFilter: string,
    selectedClass: ClassLevel,
    selectedTerm: number,
    teachers: ApiTeacher[],
    subjects: string[]
) => {
    const colors = {
        primary: [123, 17, 19],
        darkBlue: [30, 58, 95],
        gold: [212, 175, 55],
        cream: [252, 250, 245],
        lightGray: [248, 250, 252],
        text: [30, 41, 59],
        muted: [100, 116, 139],
        border: [203, 213, 225],
        white: [255, 255, 255],
        black: [0, 0, 0],
        green: [34, 197, 94],
        blue: [59, 130, 246],
        yellow: [234, 179, 8],
        purple: [139, 92, 246],
        red: [239, 68, 68]
    };

    let filteredStudents = classStudents;
    if (streamFilter !== 'ALL') {
        filteredStudents = classStudents.filter((s: any) => s.stream === streamFilter);
    }

    const studentRows = filteredStudents.map((student: any) => {
        const record = allMarks.find((m: any) =>
            m.studentId === student.id &&
            m.term === selectedTerm &&
            m.year === year &&
            m.type === type
        );

        const marks = record ? record.marks : {};
        let totalMarks = 0;
        subjects.forEach(sub => {
            totalMarks += (marks as any)[sub] || 0;
        });

        return {
            student,
            marks,
            aggregate: record ? record.aggregate : 0,
            division: record ? record.division : '-',
            totalMarks
        };
    });

    // Sort by total marks (highest first) - students without results go to bottom
    studentRows.sort((a: any, b: any) => {
        // Students without results go to the bottom
        if (a.totalMarks === 0 && b.totalMarks > 0) return 1;
        if (b.totalMarks === 0 && a.totalMarks > 0) return -1;
        // Sort by total marks descending (highest total marks = position 1)
        return b.totalMarks - a.totalMarks;
    });

    const bestPerformer = studentRows.find((r: any) => r.totalMarks > 0);
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 12;
    const timestamp = new Date().toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    const typeText = type === AssessmentType.BOT ? "BEGINNING OF TERM" : "END OF TERM";
    const termText = selectedTerm === 1 ? "I" : selectedTerm === 2 ? "II" : "III";
    const termFull = selectedTerm === 1 ? "ONE" : selectedTerm === 2 ? "TWO" : "THREE";
    const streamText = streamFilter !== 'ALL' ? ` (${streamFilter} STREAM)` : '';

    const teacherForStream = streamFilter !== 'ALL'
        ? teachers.find(t => {
            const assignments = t.teachingClasses || [];
            const hasAssignment = assignments.some((a: string) => {
                if (a.includes('-')) {
                    const [cls, strm] = a.split('-');
                    return cls === selectedClass && strm === streamFilter;
                }
                return a === selectedClass;
            });
            return hasAssignment && (t.roles || []).includes('Class Teacher');
        })
        : teachers.find(t => {
            const assignments = t.teachingClasses || [];
            const hasAssignment = assignments.some((a: string) => a === selectedClass || a.startsWith(selectedClass + '-'));
            return hasAssignment && (t.roles || []).includes('Class Teacher');
        });

    const studentsWithResults = studentRows.filter((r: any) => r.aggregate > 0);
    const divCounts: { [key: string]: number } = { I: 0, II: 0, III: 0, IV: 0, U: 0 };
    studentsWithResults.forEach((r: any) => {
        if (r.division in divCounts) divCounts[r.division as keyof typeof divCounts]++;
    });

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
    doc.text(settings.schoolName.toUpperCase(), pageWidth / 2, headerY, { align: "center" });
    headerY += 5;

    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(settings.addressBox || '', pageWidth / 2, headerY, { align: "center" });
    headerY += 4;

    doc.setFontSize(8);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(`Tel: ${settings.contactPhones || 'N/A'}`, pageWidth / 2, headerY, { align: "center" });
    headerY += 4;

    if (settings.motto) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
        doc.text(`"${settings.motto}"`, pageWidth / 2, headerY, { align: "center" });
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
    doc.text("CLASS ASSESSMENT REPORT", pageWidth / 2, headerY + 5.5, { align: "center" });
    headerY += 12;

    const infoBoxY = headerY;
    const infoBoxHeight = 18;
    doc.setFillColor(colors.cream[0], colors.cream[1], colors.cream[2]);
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(0.2);
    doc.rect(margin, infoBoxY, pageWidth - (margin * 2), infoBoxHeight, 'FD');

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

    const col1X = margin + 5;
    const col2X = margin + 80;
    const col3X = margin + 160;
    const infoY1 = infoBoxY + 6;
    const infoY2 = infoBoxY + 13;

    // Use a simple mock for getDisplayName if not provided, or we pass title directly
    // Here assuming we pass the classLevel string which is mostly display friendly or handled elsewhere
    // Actually we need the display name. Let's replicate simple logic or use what's passed.
    // We'll use the selectedClass string directly as it usually is "P1", "P7" etc. which is fine.

    doc.setFont("helvetica", "bold");
    doc.text("Class:", col1X, infoY1);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedClass}${streamText}`, col1X + 15, infoY1);

    doc.setFont("helvetica", "bold");
    doc.text("Term:", col2X, infoY1);
    doc.setFont("helvetica", "normal");
    doc.text(`Term ${termFull} (${year})`, col2X + 15, infoY1);

    doc.setFont("helvetica", "bold");
    doc.text("Assessment:", col3X, infoY1);
    doc.setFont("helvetica", "normal");
    doc.text(typeText, col3X + 28, infoY1);

    doc.setFont("helvetica", "bold");
    doc.text("Class Teacher:", col1X, infoY2);
    doc.setFont("helvetica", "normal");
    doc.text(teacherForStream ? teacherForStream.name : 'Not Assigned', col1X + 32, infoY2);

    doc.setFont("helvetica", "bold");
    doc.text("Enrollment:", col2X, infoY2);
    doc.setFont("helvetica", "normal");
    doc.text(`${filteredStudents.length} Students`, col2X + 26, infoY2);

    doc.setFont("helvetica", "bold");
    doc.text("With Results:", col3X, infoY2);
    doc.setFont("helvetica", "normal");
    doc.text(`${studentsWithResults.length} Students`, col3X + 28, infoY2);

    headerY = infoBoxY + infoBoxHeight + 4;

    const subjectColWidth = subjects.length <= 4 ? 22 : 18;
    const gradeColWidth = subjects.length <= 4 ? 10 : 8;

    const head = [
        [
            { content: 'POS', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white } },
            { content: 'STUDENT NAME', styles: { halign: 'left', fillColor: colors.primary, textColor: colors.white } },
            { content: 'SEX', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white } },
            ...subjects.flatMap(sub => [
                { content: subjectShortNames[sub] || sub.toUpperCase().substring(0, 3), styles: { halign: 'center', fillColor: colors.darkBlue, textColor: colors.white } },
                { content: 'GR', styles: { halign: 'center', fillColor: colors.darkBlue, textColor: [200, 200, 200], fontSize: 6 } }
            ]),
            { content: 'TOT', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold' } },
            { content: 'AGG', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold' } },
            { content: 'DIV', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold' } }
        ]
    ];

    let currentRank = 0;
    let prevTotal = -1;

    const body = studentRows.map((row: any, index: number) => {
        // Ranking based on total marks - same total marks = same rank
        if (row.totalMarks !== prevTotal) {
            currentRank = index + 1;
        }
        prevTotal = row.totalMarks;

        const rowData: any[] = [
            row.totalMarks > 0 ? currentRank.toString() : '-',
            row.student.name.toUpperCase(),
            row.student.gender === 'Male' ? 'M' : row.student.gender === 'Female' ? 'F' : '-'
        ];

        subjects.forEach(sub => {
            const mark = (row.marks as any)[sub];
            const { grade } = calculateGrade(mark, settings?.gradingConfig);
            rowData.push(mark !== undefined && mark !== null ? mark : '-');
            rowData.push(mark !== undefined && mark !== null ? grade : '-');
        });

        rowData.push(row.totalMarks > 0 ? row.totalMarks : '-');
        rowData.push(row.aggregate > 0 ? row.aggregate : '-');
        rowData.push(row.aggregate > 0 ? row.division : '-');

        return rowData;
    });

    const baseColIdx = 3 + (subjects.length * 2);
    const columnStyles: any = {
        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 50, halign: 'left', fontStyle: 'bold' },
        2: { cellWidth: 10, halign: 'center' },
    };

    subjects.forEach((_, i) => {
        columnStyles[3 + (i * 2)] = { cellWidth: subjectColWidth, halign: 'center' };
        columnStyles[3 + (i * 2) + 1] = { cellWidth: gradeColWidth, halign: 'center', fontSize: 7, textColor: colors.muted };
    });

    columnStyles[baseColIdx] = { cellWidth: 14, halign: 'center', fontStyle: 'bold' };
    columnStyles[baseColIdx + 1] = { cellWidth: 12, halign: 'center', fontStyle: 'bold' };
    columnStyles[baseColIdx + 2] = { cellWidth: 12, halign: 'center', fontStyle: 'bold' };

    // @ts-ignore
    doc.autoTable({
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
        headStyles: {
            fontStyle: 'bold',
            halign: 'center',
            lineWidth: 0.1,
            lineColor: colors.white,
            minCellHeight: 7
        },
        bodyStyles: {
            minCellHeight: 6
        },
        alternateRowStyles: {
            fillColor: colors.lightGray
        },
        columnStyles: columnStyles,
        margin: { left: margin, right: margin },
        didParseCell: function (data: any) {
            if (data.section === 'body') {
                const colIdx = data.column.index;
                const divColIdx = baseColIdx + 2;

                if (colIdx === 0 && data.cell.raw !== '-') {
                    const rank = parseInt(data.cell.raw);
                    if (rank === 1) {
                        data.cell.styles.textColor = [212, 175, 55];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (rank === 2) {
                        data.cell.styles.textColor = [156, 163, 175];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (rank === 3) {
                        data.cell.styles.textColor = [180, 83, 9];
                        data.cell.styles.fontStyle = 'bold';
                    }
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
        },
        didDrawPage: function () {
            doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            doc.rect(0, 0, pageWidth, 3, 'F');

            doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
            doc.setLineWidth(0.3);
            doc.rect(margin - 2, 6, pageWidth - (margin * 2) + 4, pageHeight - 12, 'S');
        }
    });

    const tableEndY = (doc as any).lastAutoTable.finalY;
    let footerY = tableEndY + 6;

    if (footerY < pageHeight - 35) {
        doc.setFillColor(colors.cream[0], colors.cream[1], colors.cream[2]);
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.setLineWidth(0.2);
        doc.rect(margin, footerY, pageWidth - (margin * 2), 12, 'FD');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
        doc.text("DIVISION SUMMARY:", margin + 4, footerY + 5);

        const passCount = studentsWithResults.filter((r: any) => ['I', 'II', 'III', 'IV'].includes(r.division)).length;
        const passRate = studentsWithResults.length > 0 ? ((passCount / studentsWithResults.length) * 100).toFixed(0) : '0';

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        let divTextX = margin + 45;

        const divColorMap: { [key: string]: number[] } = {
            'I': colors.green, 'II': colors.blue, 'III': [180, 140, 20], 'IV': colors.purple, 'U': colors.red
        };

        ['I', 'II', 'III', 'IV', 'U'].forEach(div => {
            doc.setFillColor(divColorMap[div][0], divColorMap[div][1], divColorMap[div][2]);
            doc.circle(divTextX, footerY + 4.5, 1.5, 'F');
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            doc.text(`${div}: ${divCounts[div]}`, divTextX + 3, footerY + 5);
            divTextX += 22;
        });

        doc.setFont("helvetica", "bold");
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.text(`Pass Rate: ${passRate}%`, pageWidth - margin - 35, footerY + 5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
        doc.text(`Grading: D1(90-100) D2(80-89) C3(70-79) C4(60-69) C5(55-59) C6(50-54) P7(45-49) P8(40-44) F9(0-39)`, margin + 4, footerY + 10);

        footerY += 15;
    }

    if (footerY < pageHeight - 22) {
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.setLineWidth(0.3);

        const sigY = footerY + 5;
        const sigWidth = 55;

        doc.line(margin + 5, sigY + 8, margin + 5 + sigWidth, sigY + 8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
        doc.text("Class Teacher's Signature", margin + 5, sigY + 12);

        doc.line(margin + 75, sigY + 8, margin + 75 + sigWidth, sigY + 8);
        doc.text("Head Teacher's Signature", margin + 75, sigY + 12);

        doc.line(margin + 145, sigY + 8, margin + 145 + sigWidth, sigY + 8);
        doc.text("Date", margin + 145, sigY + 12);
    }

    doc.setFontSize(6);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(`Generated: ${timestamp}`, margin, pageHeight - 4);
    doc.text(settings.schoolName, pageWidth / 2, pageHeight - 4, { align: 'center' });
    doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - margin, pageHeight - 4, { align: 'right' });

    doc.addPage();

    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(0.3);
    doc.rect(margin - 2, 6, pageWidth - (margin * 2) + 4, pageHeight - 12, 'S');

    let analysisY = 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.text("PERFORMANCE ANALYSIS REPORT", pageWidth / 2, analysisY, { align: 'center' });
    analysisY += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(`${selectedClass}${streamText} | ${typeText} | Term ${termFull} ${year}`, pageWidth / 2, analysisY, { align: 'center' });
    analysisY += 4;

    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(0.5);
    doc.line(margin + 60, analysisY, pageWidth - margin - 60, analysisY);
    analysisY += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.text("1. DIVISION ANALYSIS", margin + 2, analysisY);
    analysisY += 6;

    const passCount = studentsWithResults.filter((r: any) => ['I', 'II', 'III', 'IV'].includes(r.division)).length;
    const passRate = studentsWithResults.length > 0 ? ((passCount / studentsWithResults.length) * 100).toFixed(1) : '0';

    const divAnalysisHead = [['DIVISION', 'COUNT', 'PERCENTAGE', 'STATUS']];
    const divTotal = Object.values(divCounts).reduce((a, b) => a + b, 0);
    const divAnalysisBody = [
        ['Division I', divCounts['I'], divTotal > 0 ? ((divCounts['I'] / divTotal) * 100).toFixed(1) + '%' : '0%', 'Excellent'],
        ['Division II', divCounts['II'], divTotal > 0 ? ((divCounts['II'] / divTotal) * 100).toFixed(1) + '%' : '0%', 'Very Good'],
        ['Division III', divCounts['III'], divTotal > 0 ? ((divCounts['III'] / divTotal) * 100).toFixed(1) + '%' : '0%', 'Good'],
        ['Division IV', divCounts['IV'], divTotal > 0 ? ((divCounts['IV'] / divTotal) * 100).toFixed(1) + '%' : '0%', 'Pass'],
        ['Ungraded (U)', divCounts['U'], divTotal > 0 ? ((divCounts['U'] / divTotal) * 100).toFixed(1) + '%' : '0%', 'Fail'],
        ['TOTAL', divTotal, '100%', `Pass Rate: ${passRate}%`]
    ];

    // @ts-ignore
    doc.autoTable({
        startY: analysisY,
        head: divAnalysisHead,
        body: divAnalysisBody,
        theme: 'grid',
        styles: { fontSize: 8, lineColor: colors.border, lineWidth: 0.1, textColor: colors.text, cellPadding: 2 },
        headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
            0: { cellWidth: 35, fontStyle: 'bold' },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 40 }
        },
        margin: { left: margin },
        tableWidth: 130,
        didParseCell: function (data: any) {
            if (data.section === 'body' && data.row.index === 5) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = colors.cream;
            }
            if (data.section === 'body' && data.column.index === 0) {
                if (data.row.index === 0) data.cell.styles.textColor = colors.green;
                else if (data.row.index === 1) data.cell.styles.textColor = colors.blue;
                else if (data.row.index === 2) data.cell.styles.textColor = [180, 140, 20];
                else if (data.row.index === 3) data.cell.styles.textColor = colors.purple;
                else if (data.row.index === 4) data.cell.styles.textColor = colors.red;
            }
        }
    });

    analysisY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.text("2. SUBJECT PERFORMANCE STATISTICS", margin + 2, analysisY);
    analysisY += 6;

    const statsHead = [['SUBJECT', 'ENTRIES', 'AVERAGE', 'GRADE', 'HIGHEST', 'LOWEST', 'PASS %']];
    const statsBody = subjects.map(sub => {
        const marks = studentRows.map((r: any) => (r.marks as any)[sub]).filter((m: any) => m !== undefined && m !== null);
        const max = marks.length ? Math.max(...marks) : 0;
        const min = marks.length ? Math.min(...marks) : 0;
        const sum = marks.reduce((a: number, b: number) => a + b, 0);
        const avg = marks.length ? Math.round(sum / marks.length) : 0;
        const { grade } = calculateGrade(avg, settings?.gradingConfig);
        const passCountSub = marks.filter((m: number) => m >= 40).length;
        const passPercent = marks.length ? ((passCountSub / marks.length) * 100).toFixed(0) + '%' : '0%';

        return [subjectShortNames[sub] || sub, marks.length, avg, grade, max, min, passPercent];
    });

    // @ts-ignore
    doc.autoTable({
        startY: analysisY,
        head: statsHead,
        body: statsBody,
        theme: 'grid',
        styles: { fontSize: 8, lineColor: colors.border, lineWidth: 0.1, textColor: colors.text, cellPadding: 2 },
        headStyles: { fillColor: colors.darkBlue, textColor: colors.white, fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: colors.lightGray },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 25 },
            1: { halign: 'center', cellWidth: 20 },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
            4: { halign: 'center', cellWidth: 20 },
            5: { halign: 'center', cellWidth: 20 },
            6: { halign: 'center', cellWidth: 20 }
        },
        margin: { left: margin },
        tableWidth: 143,
        didParseCell: function (data: any) {
            if (data.section === 'body' && data.column.index === 3) {
                const grade = data.cell.raw;
                if (['D1', 'D2'].includes(grade)) data.cell.styles.textColor = colors.green;
                else if (['C3', 'C4', 'C5', 'C6'].includes(grade)) data.cell.styles.textColor = colors.blue;
                else if (['P7', 'P8'].includes(grade)) data.cell.styles.textColor = [180, 140, 20];
                else if (grade === 'F9') data.cell.styles.textColor = colors.red;
            }
        }
    });

    analysisY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.text("3. GRADE DISTRIBUTION BY SUBJECT", margin + 2, analysisY);
    analysisY += 6;

    const grades = ['D1', 'D2', 'C3', 'C4', 'C5', 'C6', 'P7', 'P8', 'F9'];
    const gradeDistHead = [['SUBJECT', ...grades]];

    const gradeDistBody = subjects.map(sub => {
        const counts: { [key: string]: number } = {};
        grades.forEach(g => counts[g] = 0);

        studentRows.forEach((row: any) => {
            const mark = (row.marks as any)[sub];
            if (mark !== undefined && mark !== null) {
                const { grade } = calculateGrade(mark, settings?.gradingConfig);
                if (counts[grade] !== undefined) counts[grade]++;
            }
        });

        return [subjectShortNames[sub], ...grades.map(g => counts[g] || '-')];
    });

    // @ts-ignore
    doc.autoTable({
        startY: analysisY,
        head: gradeDistHead,
        body: gradeDistBody,
        theme: 'grid',
        styles: { fontSize: 7.5, lineColor: colors.border, lineWidth: 0.1, textColor: colors.text, cellPadding: 1.5, halign: 'center' },
        headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: colors.lightGray },
        columnStyles: { 0: { fontStyle: 'bold', halign: 'left', cellWidth: 22 } },
        margin: { left: margin },
        tableWidth: pageWidth - (margin * 2)
    });

    analysisY = (doc as any).lastAutoTable.finalY + 10;

    if (bestPerformer && analysisY < pageHeight - 45) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
        doc.text("4. TOP PERFORMERS", margin + 2, analysisY);
        analysisY += 6;

        // Top performers based on total marks (already sorted by total marks)
        const top5 = studentRows.filter((r: any) => r.totalMarks > 0).slice(0, 5);
        const topHead = [['POSITION', 'STUDENT NAME', 'STREAM', 'TOTAL MARKS', 'AGGREGATE', 'DIVISION']];
        const topBody = top5.map((row: any, i: number) => [
            i + 1,
            row.student.name.toUpperCase(),
            row.student.stream || '-',
            row.totalMarks,
            row.aggregate,
            row.division
        ]);

        // @ts-ignore
        doc.autoTable({
            startY: analysisY,
            head: topHead,
            body: topBody,
            theme: 'grid',
            styles: { fontSize: 8, lineColor: colors.border, lineWidth: 0.1, textColor: colors.text, cellPadding: 2 },
            headStyles: { fillColor: colors.gold, textColor: colors.text, fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
                1: { cellWidth: 60, fontStyle: 'bold' },
                2: { cellWidth: 30, halign: 'center' },
                3: { cellWidth: 20, halign: 'center' },
                4: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
                5: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }
            },
            margin: { left: margin },
            tableWidth: 175,
            didParseCell: function (data: any) {
                if (data.section === 'body') {
                    if (data.column.index === 0) {
                        if (data.row.index === 0) data.cell.styles.textColor = [212, 175, 55];
                        else if (data.row.index === 1) data.cell.styles.textColor = [156, 163, 175];
                        else if (data.row.index === 2) data.cell.styles.textColor = [180, 83, 9];
                    }
                    if (data.column.index === 5) {
                        const div = data.cell.raw;
                        if (div === 'I') data.cell.styles.textColor = colors.green;
                        else if (div === 'II') data.cell.styles.textColor = colors.blue;
                        else if (div === 'III') data.cell.styles.textColor = [180, 140, 20];
                        else if (div === 'IV') data.cell.styles.textColor = colors.purple;
                    }
                }
            }
        });
    }

    doc.setFontSize(6);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(`Generated: ${timestamp}`, margin, pageHeight - 4);
    doc.text(settings.schoolName, pageWidth / 2, pageHeight - 4, { align: 'center' });
    doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - margin, pageHeight - 4, { align: 'right' });
}

export const generateAssessmentPDF = async (
    allStudents: any[],
    allMarks: any[],
    settings: SchoolSettings,
    selectedClass: ClassLevel,
    selectedStream: string,
    selectedTerm: number,
    selectedType: AssessmentType | 'BOTH',
    teachers: ApiTeacher[],
    subjects: string[]
) => {
    const classStudents = allStudents.filter(s => s.classLevel === selectedClass);
    const year = settings.currentYear || new Date().getFullYear();

    let filteredStudents = classStudents;
    if (selectedStream !== 'ALL') {
        filteredStudents = classStudents.filter(s => s.stream === selectedStream);
    }

    if (filteredStudents.length === 0) {
        alert("No students found for this selection.");
        return;
    }

    const doc = new jspdf.jsPDF('l', 'mm', 'a4');

    const reportsToGenerate = selectedType === 'BOTH'
        ? [AssessmentType.BOT, AssessmentType.EOT]
        : [selectedType];

    for (let i = 0; i < reportsToGenerate.length; i++) {
        const type = reportsToGenerate[i];
        if (i > 0) doc.addPage();
        generateSection(doc, type, classStudents, allMarks, settings, year, selectedStream, selectedClass, selectedTerm, teachers, subjects);
    }

    const sanitizedSchoolName = settings.schoolName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const streamSuffix = selectedStream !== 'ALL' ? `_${selectedStream}` : '';
    doc.save(`${sanitizedSchoolName}_Assessment_${selectedClass}${streamSuffix}_Term${selectedTerm}_${selectedType}.pdf`);
};
