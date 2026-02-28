import { Student, ClassLevel, SubjectMarks, SchoolSettings, P7ExamSet, P7Score, SUBJECTS_UPPER } from '../../../types';
import { calculateGrade, calculateDivision } from '../../../services/grading';
import { apiRequest } from '../../../services/api';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface P7ReportResult {
    setName: string;
    marks: SubjectMarks;
    total: number;
    aggregate: number;
    division: string;
    position?: number;
}

const getStudentResults = (studentId: number, marksData: { [studentId: number]: SubjectMarks }, settings: SchoolSettings | null) => {
    const marks: SubjectMarks = marksData[studentId] || {};
    const aggregate = calculateAggregate(marks as any, ClassLevel.P7, settings?.gradingConfig);
    const division = calculateDivision(aggregate, ClassLevel.P7, settings?.gradingConfig);
    const total = (marks.english || 0) + (marks.maths || 0) + (marks.science || 0) + (marks.sst || 0);
    return { marks, aggregate, division, total };
};

const getAllSetScoresForStudent = async (studentId: number, termSets: P7ExamSet[]) => {
    const results: P7ReportResult[] = [];

    for (const set of termSets) {
        try {
            const allScores = await apiRequest<P7Score[]>('GET', `/p7-scores?examSetId=${set.id}`);
            const score = allScores.find(s => s.studentId === studentId);
            if (score) {
                results.push({
                    setName: set.name,
                    marks: score.marks as SubjectMarks,
                    total: score.total,
                    aggregate: score.aggregate,
                    division: score.division,
                    position: score.position
                });
            }
        } catch (err) {
            console.error(`Error fetching scores for set ${set.id}:`, err);
        }
    }
    return results;
};

export const generateP7ReportCard = async (
    student: Student,
    examSets: P7ExamSet[],
    selectedTerm: number,
    selectedYear: number,
    settings: SchoolSettings,
    showMessage: (msg: string, type: 'success' | 'error' | 'info') => void
) => {
    try {
        if (!settings) return;

        const termSets = examSets.filter(s => s.term === selectedTerm && s.year === selectedYear);
        if (termSets.length === 0) {
            showMessage('No exam sets found for this term', 'error');
            return;
        }

        const studentResults = await getAllSetScoresForStudent(student.id!, termSets);
        if (studentResults.length === 0) {
            showMessage(`No scores found for ${student.name}`, 'error');
            return;
        }

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

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 12;
        const termText = selectedTerm === 1 ? "ONE" : selectedTerm === 2 ? "TWO" : "THREE";

        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(0, 0, pageWidth, 3, 'F');

        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.setLineWidth(0.3);
        doc.rect(margin - 2, 6, pageWidth - (margin * 2) + 4, pageHeight - 12, 'S');

        let currentY = 12;
        const logoSize = 16;

        if (settings.logoBase64) {
            try {
                let format = 'PNG';
                if (settings.logoBase64.startsWith('data:image/jpeg')) format = 'JPEG';
                doc.addImage(settings.logoBase64, format, pageWidth / 2 - logoSize / 2, currentY, logoSize, logoSize);
                currentY += logoSize + 2;
            } catch (e) { currentY += 2; }
        }

        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(settings.schoolName.toUpperCase(), pageWidth / 2, currentY, { align: "center" });
        currentY += 5;

        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        if (settings.addressBox) {
            doc.text(settings.addressBox, pageWidth / 2, currentY, { align: "center" });
            currentY += 3;
        }

        doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        currentY += 4;
        doc.text(`P7 COMBINED EXAM REPORT - TERM ${termText} ${selectedYear}`, pageWidth / 2, currentY, { align: "center" });
        currentY += 8;

        doc.setFillColor(colors.cream[0], colors.cream[1], colors.cream[2]);
        doc.roundedRect(margin, currentY, pageWidth - margin * 2, 20, 2, 2, 'F');

        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        const labelX1 = margin + 4;
        const labelX2 = pageWidth / 2 + 4;

        doc.text("Student Name:", labelX1, currentY + 6);
        doc.text("Stream:", labelX2, currentY + 6);
        doc.text("Gender:", labelX1, currentY + 14);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(student.name, labelX1 + 28, currentY + 6);
        doc.text(student.stream || '-', labelX2 + 16, currentY + 6);
        doc.text(student.gender === 'M' ? 'Male' : 'Female', labelX1 + 16, currentY + 14);

        currentY += 26;

        const tableHeaders = ['Exam Set', 'ENG', 'MTC', 'SCI', 'SST', 'Total', 'Agg', 'Div'];
        const colWidths = [40, 18, 18, 18, 18, 20, 16, 16];
        const tableWidth = colWidths.reduce((a, b) => a + b, 0);
        const tableX = (pageWidth - tableWidth) / 2;

        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.roundedRect(tableX, currentY, tableWidth, 8, 1, 1, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        let headerX = tableX;
        tableHeaders.forEach((header, i) => {
            doc.text(header, headerX + colWidths[i] / 2, currentY + 5.5, { align: 'center' });
            headerX += colWidths[i];
        });
        currentY += 8;

        let totalAgg = 0;
        let totalMarks = 0;
        let totalSets = 0;

        studentResults.forEach((result, idx) => {
            const isEven = idx % 2 === 0;
            if (!isEven) {
                doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
                doc.rect(tableX, currentY, tableWidth, 8, 'F');
            }

            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);

            let cellX = tableX;
            const rowData = [
                result.setName.substring(0, 15),
                result.marks.english?.toString() || '-',
                result.marks.maths?.toString() || '-',
                result.marks.science?.toString() || '-',
                result.marks.sst?.toString() || '-',
                result.total.toString(),
                result.aggregate.toString(),
                result.division
            ];

            rowData.forEach((cell, i) => {
                if (i === 7) {
                    const divColor = result.division === 'I' ? colors.green : result.division === 'II' ? colors.blue : result.division === 'III' ? colors.yellow : result.division === 'IV' ? colors.purple : colors.red;
                    doc.setTextColor(divColor[0], divColor[1], divColor[2]);
                    doc.setFont("helvetica", "bold");
                }
                doc.text(cell, cellX + colWidths[i] / 2, currentY + 5.5, { align: 'center' });
                doc.setFont("helvetica", "normal");
                doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
                cellX += colWidths[i];
            });

            totalAgg += result.aggregate;
            totalMarks += result.total;
            totalSets++;
            currentY += 8;
        });

        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.setLineWidth(0.2);
        doc.line(tableX, currentY, tableX + tableWidth, currentY);
        currentY += 8;

        const avgAgg = (totalAgg / totalSets).toFixed(1);
        const avgTotal = (totalMarks / totalSets).toFixed(0);
        const overallDiv = calculateDivision(Number(avgAgg), ClassLevel.P7, settings?.gradingConfig);

        doc.setFillColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
        doc.roundedRect(margin, currentY, pageWidth - margin * 2, 18, 2, 2, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("OVERALL PERFORMANCE SUMMARY", pageWidth / 2, currentY + 6, { align: "center" });

        doc.setFontSize(9);
        doc.text(`Average Aggregate: ${avgAgg}   |   Average Total: ${avgTotal}   |   Overall Division: ${overallDiv}`, pageWidth / 2, currentY + 13, { align: "center" });
        currentY += 24;

        const subjectPerformance: { [key: string]: number[] } = { english: [], maths: [], science: [], sst: [] };
        studentResults.forEach(r => {
            if (r.marks.english !== undefined) subjectPerformance.english.push(r.marks.english);
            if (r.marks.maths !== undefined) subjectPerformance.maths.push(r.marks.maths);
            if (r.marks.science !== undefined) subjectPerformance.science.push(r.marks.science);
            if (r.marks.sst !== undefined) subjectPerformance.sst.push(r.marks.sst);
        });

        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("Subject Performance Trend", margin, currentY);
        currentY += 5;

        const barWidth = (pageWidth - margin * 2 - 40) / 4;
        const barMaxHeight = 20;
        const subjects = SUBJECTS_UPPER;
        const subjectNames: { [key: string]: string } = {
            english: 'English',
            maths: 'Mathematics',
            science: 'Science',
            sst: 'Social Studies'
        };

        subjects.forEach((sub, i) => {
            const scores = subjectPerformance[sub] || [];
            const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            const barHeight = (avg / 100) * barMaxHeight;
            const barX = margin + 20 + i * (barWidth + 8);

            doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
            doc.rect(barX, currentY + (barMaxHeight - barHeight), barWidth, barHeight, 'F');

            doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            doc.rect(barX, currentY + (barMaxHeight - barHeight), barWidth, barHeight, 'F');

            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.text(subjectNames[sub].substring(0, 4), barX + barWidth / 2, currentY + barMaxHeight + 4, { align: 'center' });
            doc.text(`${avg.toFixed(0)}%`, barX + barWidth / 2, currentY + barMaxHeight + 8, { align: 'center' });
        });
        currentY += barMaxHeight + 16;

        doc.setFillColor(colors.cream[0], colors.cream[1], colors.cream[2]);
        doc.roundedRect(margin, currentY, pageWidth - margin * 2, 25, 2, 2, 'F');

        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("Class Teacher's Comment:", margin + 4, currentY + 6);
        doc.text("Head Teacher's Signature:", margin + 4, currentY + 18);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const comment = overallDiv === 'I' ? 'Excellent performance! Keep up the outstanding work.' :
            overallDiv === 'II' ? 'Very good performance. Continue striving for excellence.' :
                overallDiv === 'III' ? 'Good effort. More dedication will improve your results.' :
                    overallDiv === 'IV' ? 'Fair performance. Needs significant improvement.' :
                        'Poor performance. Requires extra support and hard work.';
        doc.text(comment, margin + 50, currentY + 6);

        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.line(margin + 55, currentY + 20, margin + 90, currentY + 20);
        currentY += 30;

        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.text(settings.motto || "Excellence in Education", pageWidth / 2, pageHeight - 3, { align: "center" });

        doc.save(`P7_Report_${student.name.replace(/\s+/g, '_')}_Term${selectedTerm}_${selectedYear}.pdf`);
    } catch (err: any) {
        console.error('P7 report card error:', err);
        showMessage(`Failed to generate P7 report: ${err?.message || 'Unknown error'}`, 'error');
    }
};

export const generateAssessmentSheet = (
    selectedSet: P7ExamSet,
    settings: SchoolSettings,
    students: Student[],
    positions: { [id: number]: number },
    marksData: { [studentId: number]: SubjectMarks },
    selectedTerm: number,
    selectedYear: number,
    selectedStream: string,
    showMessage: (msg: string, type: 'success' | 'error' | 'info') => void
) => {
    try {
        if (!selectedSet || !settings) {
            showMessage('Please select an exam set first', 'error');
            return;
        }

        const studentsWithMarks = students.map(student => {
            const { marks, aggregate, division, total } = getStudentResults(student.id!, marksData, settings);
            const pos = positions[student.id!];
            return { student, marks, aggregate, division, total, position: pos };
        }).filter(s => s.total > 0).sort((a, b) => (a.position || 999) - (b.position || 999));

        if (studentsWithMarks.length === 0) {
            showMessage('No marks entered yet. Please enter marks first.', 'error');
            return;
        }

        const colors = {
            primary: [123, 17, 19],
            darkBlue: [30, 58, 95],
            headerBg: [248, 250, 252],
            text: [30, 41, 59],
            muted: [100, 116, 139],
            border: [203, 213, 225],
            white: [255, 255, 255],
            divI: [34, 197, 94],
            divII: [59, 130, 246],
            divIII: [234, 179, 8],
            divIV: [139, 92, 246],
            divU: [239, 68, 68]
        };

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 10;
        const termText = selectedTerm === 1 ? "ONE" : selectedTerm === 2 ? "TWO" : "THREE";

        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(0, 0, pageWidth, 3, 'F');

        let currentY = 8;
        const logoSize = 12;

        if (settings.logoBase64) {
            try {
                let format = 'PNG';
                if (settings.logoBase64.startsWith('data:image/jpeg')) format = 'JPEG';
                doc.addImage(settings.logoBase64, format, margin, currentY, logoSize, logoSize);
            } catch (e) { }
        }

        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(settings.schoolName.toUpperCase(), pageWidth / 2, currentY + 4, { align: "center" });

        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        if (settings.addressBox) {
            doc.text(settings.addressBox, pageWidth / 2, currentY + 9, { align: "center" });
        }

        doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`P7 ASSESSMENT SHEET - ${selectedSet.name.toUpperCase()}`, pageWidth / 2, currentY + 16, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.text(`Term ${termText} ${selectedYear}  |  Stream: ${selectedStream === 'All' ? 'All Streams' : selectedStream}  |  Total Students: ${studentsWithMarks.length}`, pageWidth / 2, currentY + 22, { align: "center" });

        currentY += 28;

        const colWidths = { pos: 10, name: 75, eng: 18, math: 18, sci: 18, sst: 18, total: 16, agg: 14, div: 14 };
        const tableWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);
        const startX = (pageWidth - tableWidth) / 2;

        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(startX, currentY, tableWidth, 8, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);

        let colX = startX;
        doc.text("POS", colX + colWidths.pos / 2, currentY + 5.5, { align: "center" });
        colX += colWidths.pos;
        doc.text("STUDENT NAME", colX + 2, currentY + 5.5);
        colX += colWidths.name;
        doc.text("ENG", colX + colWidths.eng / 2, currentY + 5.5, { align: "center" });
        colX += colWidths.eng;
        doc.text("MATH", colX + colWidths.math / 2, currentY + 5.5, { align: "center" });
        colX += colWidths.math;
        doc.text("SCI", colX + colWidths.sci / 2, currentY + 5.5, { align: "center" });
        colX += colWidths.sci;
        doc.text("SST", colX + colWidths.sst / 2, currentY + 5.5, { align: "center" });
        colX += colWidths.sst;
        doc.text("TOTAL", colX + colWidths.total / 2, currentY + 5.5, { align: "center" });
        colX += colWidths.total;
        doc.text("AGG", colX + colWidths.agg / 2, currentY + 5.5, { align: "center" });
        colX += colWidths.agg;
        doc.text("DIV", colX + colWidths.div / 2, currentY + 5.5, { align: "center" });

        currentY += 8;
        const rowHeight = 6;
        let pageNum = 1;

        studentsWithMarks.forEach((item, idx) => {
            if (currentY + rowHeight > pageHeight - 20) {
                doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "italic");
                doc.setFontSize(7);
                doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 3, { align: "right" });

                doc.addPage();
                pageNum++;
                currentY = 15;

                doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                doc.rect(startX, currentY, tableWidth, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(8);

                let hColX = startX;
                doc.text("POS", hColX + colWidths.pos / 2, currentY + 5.5, { align: "center" });
                hColX += colWidths.pos;
                doc.text("STUDENT NAME", hColX + 2, currentY + 5.5);
                hColX += colWidths.name;
                doc.text("ENG", hColX + colWidths.eng / 2, currentY + 5.5, { align: "center" });
                hColX += colWidths.eng;
                doc.text("MATH", hColX + colWidths.math / 2, currentY + 5.5, { align: "center" });
                hColX += colWidths.math;
                doc.text("SCI", hColX + colWidths.sci / 2, currentY + 5.5, { align: "center" });
                hColX += colWidths.sci;
                doc.text("SST", hColX + colWidths.sst / 2, currentY + 5.5, { align: "center" });
                hColX += colWidths.sst;
                doc.text("TOTAL", hColX + colWidths.total / 2, currentY + 5.5, { align: "center" });
                hColX += colWidths.total;
                doc.text("AGG", hColX + colWidths.agg / 2, currentY + 5.5, { align: "center" });
                hColX += colWidths.agg;
                doc.text("DIV", hColX + colWidths.div / 2, currentY + 5.5, { align: "center" });
                currentY += 8;
            }

            if (idx % 2 === 0) {
                doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2]);
                doc.rect(startX, currentY, tableWidth, rowHeight, 'F');
            }

            doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
            doc.setLineWidth(0.1);
            doc.line(startX, currentY + rowHeight, startX + tableWidth, currentY + rowHeight);

            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);

            const { student, marks, aggregate, division, total, position } = item;
            const engGrade = calculateGrade((marks as any).english, settings?.gradingConfig);
            const mathGrade = calculateGrade((marks as any).maths, settings?.gradingConfig);
            const sciGrade = calculateGrade((marks as any).science, settings?.gradingConfig);
            const sstGrade = calculateGrade((marks as any).sst, settings?.gradingConfig);

            let rColX = startX;

            doc.setFont("helvetica", "bold");
            doc.text(String(position || '-'), rColX + colWidths.pos / 2, currentY + 4, { align: "center" });
            rColX += colWidths.pos;

            doc.setFont("helvetica", "normal");
            doc.text(student.name.substring(0, 28), rColX + 2, currentY + 4);
            rColX += colWidths.name;

            doc.text(`${(marks as any).english || '-'} (${engGrade.grade})`, rColX + colWidths.eng / 2, currentY + 4, { align: "center" });
            rColX += colWidths.eng;

            doc.text(`${(marks as any).maths || '-'} (${mathGrade.grade})`, rColX + colWidths.math / 2, currentY + 4, { align: "center" });
            rColX += colWidths.math;

            doc.text(`${(marks as any).science || '-'} (${sciGrade.grade})`, rColX + colWidths.sci / 2, currentY + 4, { align: "center" });
            rColX += colWidths.sci;

            doc.text(`${(marks as any).sst || '-'} (${sstGrade.grade})`, rColX + colWidths.sst / 2, currentY + 4, { align: "center" });
            rColX += colWidths.sst;

            doc.setFont("helvetica", "bold");
            doc.text(String(total), rColX + colWidths.total / 2, currentY + 4, { align: "center" });
            rColX += colWidths.total;

            doc.text(String(aggregate), rColX + colWidths.agg / 2, currentY + 4, { align: "center" });
            rColX += colWidths.agg;

            const divColor = division === 'I' ? colors.divI : division === 'II' ? colors.divII :
                division === 'III' ? colors.divIII : division === 'IV' ? colors.divIV : colors.divU;
            doc.setTextColor(divColor[0], divColor[1], divColor[2]);
            doc.text(division, rColX + colWidths.div / 2, currentY + 4, { align: "center" });

            currentY += rowHeight;
        });

        currentY += 5;
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("DIVISION SUMMARY:", startX, currentY);

        const divCounts = { I: 0, II: 0, III: 0, IV: 0, U: 0 };
        studentsWithMarks.forEach(s => {
            if (s.division in divCounts) divCounts[s.division as keyof typeof divCounts]++;
        });

        doc.setFont("helvetica", "normal");
        const summaryText = `Div I: ${divCounts.I}  |  Div II: ${divCounts.II}  |  Div III: ${divCounts.III}  |  Div IV: ${divCounts.IV}  |  U: ${divCounts.U}  |  Pass Rate: ${(((divCounts.I + divCounts.II + divCounts.III + divCounts.IV) / studentsWithMarks.length) * 100).toFixed(1)}%`;
        doc.text(summaryText, startX + 35, currentY);

        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.text(settings.motto || "Excellence in Education", pageWidth / 2, pageHeight - 3, { align: "center" });
        doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 3, { align: "right" });
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, pageHeight - 3);

        doc.save(`P7_Assessment_${selectedSet.name.replace(/\s+/g, '_')}_Term${selectedTerm}_${selectedYear}.pdf`);
        showMessage('Assessment sheet downloaded!', 'success');
    } catch (err: any) {
        console.error('P7 assessment sheet error:', err);
        showMessage(`Failed to generate assessment sheet: ${err?.message || 'Unknown error'}`, 'error');
    }
};
