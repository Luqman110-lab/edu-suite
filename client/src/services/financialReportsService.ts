import * as XLSX from 'xlsx';
import { SchoolSettings, Student, FeePayment } from '../../../types';
import { Expense, ExpenseCategory, ReportConfig } from '../types/finance';

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' });
};

const addReportHeader = (doc: any, title: string, config: ReportConfig, yPos: number = 20) => {
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(config.schoolName || 'School Name', pageWidth / 2, yPos, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (config.addressBox) {
        doc.text(config.addressBox, pageWidth / 2, yPos + 6, { align: 'center' });
    }
    if (config.contactPhones) {
        doc.text(config.contactPhones, pageWidth / 2, yPos + 11, { align: 'center' });
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, yPos + 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-UG')}`, pageWidth / 2, yPos + 26, { align: 'center' });

    return yPos + 35;
};

// --- PDF Generators ---

export const generateFeeCollectionReport = (
    payments: FeePayment[],
    students: Student[],
    config: ReportConfig,
    term: number,
    year: number,
    selectedClass: string
) => {
    const doc = new jsPDF();

    const getStudentIdsForClass = () => {
        if (selectedClass === 'All') return new Set(students.map(s => s.id));
        return new Set(students.filter(s => s.classLevel === selectedClass).map(s => s.id));
    };

    const studentIds = getStudentIdsForClass();
    const filteredPayments = payments.filter(p =>
        p.term === term && p.year === year &&
        (selectedClass === 'All' || studentIds.has(p.studentId!))
    );

    const classLabel = selectedClass === 'All' ? 'All Classes' : selectedClass;
    let y = addReportHeader(doc, `Fee Collection Report - ${classLabel} - Term ${term}, ${year}`, config);

    const byFeeType: { [key: string]: FeePayment[] } = {};
    filteredPayments.forEach(p => {
        if (!byFeeType[p.feeType]) byFeeType[p.feeType] = [];
        byFeeType[p.feeType].push(p);
    });

    let grandTotalDue = 0;
    let grandTotalPaid = 0;

    Object.entries(byFeeType).forEach(([feeType, typePayments]) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(feeType, 14, y);
        y += 6;

        const tableData = typePayments.map(p => {
            const student = students.find(s => s.id === p.studentId);
            return [
                formatDate(p.paymentDate || ''),
                student?.name || 'Unknown',
                student?.classLevel || '-',
                formatCurrency(p.amountDue),
                formatCurrency(p.amountPaid),
                p.status || 'pending',
                p.paymentMethod || '-'
            ];
        });

        const typeTotalDue = typePayments.reduce((sum, p) => sum + (p.amountDue || 0), 0);
        const typeTotalPaid = typePayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
        grandTotalDue += typeTotalDue;
        grandTotalPaid += typeTotalPaid;

        tableData.push([
            '', 'SUBTOTAL', '', formatCurrency(typeTotalDue), formatCurrency(typeTotalPaid), '', ''
        ]);

        (doc as any).autoTable({
            startY: y,
            head: [['Date', 'Student', 'Class', 'Due', 'Paid', 'Status', 'Method']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [0, 82, 204], fontSize: 8 },
            styles: { fontSize: 7, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 22 },
                1: { cellWidth: 40 },
                2: { cellWidth: 18 },
                3: { cellWidth: 28, halign: 'right' },
                4: { cellWidth: 28, halign: 'right' },
                5: { cellWidth: 18 },
                6: { cellWidth: 25 }
            }
        });

        y = (doc as any).lastAutoTable.finalY + 10;

        if (y > 260) {
            doc.addPage();
            y = 20;
        }
    });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`GRAND TOTAL - Due: ${formatCurrency(grandTotalDue)} | Paid: ${formatCurrency(grandTotalPaid)} | Balance: ${formatCurrency(grandTotalDue - grandTotalPaid)}`, 14, y + 5);

    doc.save(`Fee_Collection_Report_Term${term}_${year}.pdf`);
};

export const generateExpenseReport = (
    expenses: Expense[],
    categories: ExpenseCategory[],
    config: ReportConfig,
    dateFrom: string | undefined,
    dateTo: string | undefined
) => {
    const doc = new jsPDF();

    let filteredExpenses = expenses;
    if (dateFrom) {
        filteredExpenses = filteredExpenses.filter(e => e.expenseDate >= dateFrom);
    }
    if (dateTo) {
        filteredExpenses = filteredExpenses.filter(e => e.expenseDate <= dateTo);
    }

    const dateRange = dateFrom || dateTo
        ? `${dateFrom || 'Start'} to ${dateTo || 'Present'}`
        : 'All Time';

    let y = addReportHeader(doc, `Expense Report - ${dateRange}`, config);

    const getCategoryName = (id: number) => categories.find(c => c.id === id)?.name || 'Uncategorized';

    const byCategory: { [key: string]: Expense[] } = {};
    filteredExpenses.forEach(e => {
        const catName = getCategoryName(e.categoryId);
        if (!byCategory[catName]) byCategory[catName] = [];
        byCategory[catName].push(e);
    });

    let grandTotal = 0;

    Object.entries(byCategory).forEach(([category, catExpenses]) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(category, 14, y);
        y += 6;

        const tableData = catExpenses.map(e => [
            formatDate(e.expenseDate),
            e.description,
            e.vendorName || '-',
            e.receiptNumber || '-',
            formatCurrency(e.amount)
        ]);

        const categoryTotal = catExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        grandTotal += categoryTotal;

        tableData.push(['', 'SUBTOTAL', '', '', formatCurrency(categoryTotal)]);

        (doc as any).autoTable({
            startY: y,
            head: [['Date', 'Description', 'Vendor', 'Receipt #', 'Amount']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [255, 86, 48], fontSize: 8 },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 60 },
                2: { cellWidth: 35 },
                3: { cellWidth: 25 },
                4: { cellWidth: 35, halign: 'right' }
            }
        });

        y = (doc as any).lastAutoTable.finalY + 10;

        if (y > 260) {
            doc.addPage();
            y = 20;
        }
    });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`GRAND TOTAL: ${formatCurrency(grandTotal)}`, 14, y + 5);

    doc.save(`Expense_Report_${dateFrom || 'all'}_to_${dateTo || 'present'}.pdf`);
};

export const generateIncomeStatement = (
    payments: FeePayment[],
    expenses: Expense[],
    categories: ExpenseCategory[],
    config: ReportConfig,
    term: number,
    year: number
) => {
    const doc = new jsPDF();

    const filteredPayments = payments.filter(p =>
        p.term === term && p.year === year
    );

    const yearExpenses = expenses.filter(e => {
        const expYear = new Date(e.expenseDate).getFullYear();
        return expYear === year;
    });

    let y = addReportHeader(doc, `Income Statement - Term ${term}, ${year}`, config);

    const revenueByType: { [key: string]: number } = {};
    filteredPayments.forEach(p => {
        if (!revenueByType[p.feeType]) revenueByType[p.feeType] = 0;
        revenueByType[p.feeType] += p.amountPaid || 0;
    });

    const getCategoryName = (id: number) => categories.find(c => c.id === id)?.name || 'Uncategorized';

    const expenseByCategory: { [key: string]: number } = {};
    yearExpenses.forEach(e => {
        const catName = getCategoryName(e.categoryId);
        if (!expenseByCategory[catName]) expenseByCategory[catName] = 0;
        expenseByCategory[catName] += e.amount || 0;
    });

    const totalRevenue = Object.values(revenueByType).reduce((a, b) => a + b, 0);
    const totalExpenses = Object.values(expenseByCategory).reduce((a, b) => a + b, 0);
    const netIncome = totalRevenue - totalExpenses;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('REVENUE', 14, y);
    y += 8;

    const revenueData = Object.entries(revenueByType).map(([type, amount]) => [type, formatCurrency(amount)]);
    revenueData.push(['TOTAL REVENUE', formatCurrency(totalRevenue)]);

    (doc as any).autoTable({
        startY: y,
        head: [['Fee Type', 'Amount']],
        body: revenueData,
        theme: 'plain',
        headStyles: { fillColor: [0, 135, 90], textColor: 255, fontSize: 9 },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 60, halign: 'right' }
        }
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('EXPENSES', 14, y);
    y += 8;

    const expenseData = Object.entries(expenseByCategory).map(([cat, amount]) => [cat, formatCurrency(amount)]);
    expenseData.push(['TOTAL EXPENSES', formatCurrency(totalExpenses)]);

    (doc as any).autoTable({
        startY: y,
        head: [['Category', 'Amount']],
        body: expenseData,
        theme: 'plain',
        headStyles: { fillColor: [255, 86, 48], textColor: 255, fontSize: 9 },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 60, halign: 'right' }
        }
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(14, y, 180, y);
    y += 8;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const netColor = netIncome >= 0 ? [0, 135, 90] : [255, 86, 48];
    doc.setTextColor(netColor[0], netColor[1], netColor[2]);
    doc.text(`NET INCOME: ${formatCurrency(netIncome)}`, 14, y);
    doc.setTextColor(0);

    doc.save(`Income_Statement_Term${term}_${year}.pdf`);
};

export const generateOutstandingFeesReport = (
    payments: FeePayment[],
    students: Student[],
    config: ReportConfig,
    term: number,
    year: number,
    selectedClass: string
) => {
    const doc = new jsPDF();

    const classLabel = selectedClass === 'All' ? 'All Classes' : selectedClass;
    let y = addReportHeader(doc, `Outstanding Fees Report - ${classLabel} - Term ${term}, ${year}`, config);

    const studentBalances: { studentId: number; name: string; classLevel: string; totalDue: number; totalPaid: number; balance: number }[] = [];

    const getStudentIdsForClass = () => {
        if (selectedClass === 'All') return new Set(students.map(s => s.id));
        return new Set(students.filter(s => s.classLevel === selectedClass).map(s => s.id));
    };
    const studentIds = getStudentIdsForClass();

    const filteredPayments = payments.filter(p =>
        p.term === term && p.year === year &&
        (selectedClass === 'All' || studentIds.has(p.studentId!))
    );

    const studentPaymentMap: { [studentId: number]: { due: number; paid: number } } = {};
    filteredPayments.forEach(p => {
        if (!p.studentId) return;
        if (!studentPaymentMap[p.studentId]) {
            studentPaymentMap[p.studentId] = { due: 0, paid: 0 };
        }
        studentPaymentMap[p.studentId].due += p.amountDue || 0;
        studentPaymentMap[p.studentId].paid += p.amountPaid || 0;
    });

    Object.entries(studentPaymentMap).forEach(([studentIdStr, data]) => {
        const studentId = parseInt(studentIdStr);
        const balance = data.due - data.paid;

        if (balance > 0) {
            const student = students.find(s => s.id === studentId);
            const studentName = student?.name || 'Unknown';
            const studentClass = student?.classLevel || '-';

            studentBalances.push({
                studentId,
                name: studentName,
                classLevel: studentClass,
                totalDue: data.due,
                totalPaid: data.paid,
                balance
            });
        }
    });

    studentBalances.sort((a, b) => b.balance - a.balance);

    const tableData = studentBalances.map((sb, idx) => [
        (idx + 1).toString(),
        sb.name,
        sb.classLevel,
        formatCurrency(sb.totalDue),
        formatCurrency(sb.totalPaid),
        formatCurrency(sb.balance)
    ]);

    const totalOutstanding = studentBalances.reduce((sum, sb) => sum + sb.balance, 0);

    (doc as any).autoTable({
        startY: y,
        head: [['#', 'Student Name', 'Class', 'Total Due', 'Paid', 'Balance']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [255, 153, 31], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 50 },
            2: { cellWidth: 20 },
            3: { cellWidth: 35, halign: 'right' },
            4: { cellWidth: 35, halign: 'right' },
            5: { cellWidth: 35, halign: 'right' }
        }
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Students with Outstanding Fees: ${studentBalances.length}`, 14, y);
    doc.text(`Total Outstanding Amount: ${formatCurrency(totalOutstanding)}`, 14, y + 7);

    doc.save(`Outstanding_Fees_Term${term}_${year}.pdf`);
};

export const generatePaymentReceipt = (
    payment: FeePayment,
    students: Student[],
    config: ReportConfig
) => {
    const doc = new jsPDF({ format: [210, 148] });

    const pageWidth = doc.internal.pageSize.width;
    const student = students.find(s => s.id === payment.studentId);
    const studentName = student?.name || 'Unknown';
    const studentClass = student?.classLevel || '-';

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(config.schoolName || 'School Name', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (config.addressBox) {
        doc.text(config.addressBox, pageWidth / 2, 21, { align: 'center' });
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT RECEIPT', pageWidth / 2, 32, { align: 'center' });

    doc.setDrawColor(0, 82, 204);
    doc.setLineWidth(0.5);
    doc.line(14, 36, pageWidth - 14, 36);

    let y = 45;
    const leftX = 14;
    const rightX = 110;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    doc.text('Receipt No:', leftX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(payment.receiptNumber || `RCP-${payment.id}`, leftX + 30, y);

    doc.setFont('helvetica', 'normal');
    doc.text('Date:', rightX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDate(payment.paymentDate || ''), rightX + 20, y);

    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.text('Student:', leftX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(studentName, leftX + 30, y);

    doc.setFont('helvetica', 'normal');
    doc.text('Class:', rightX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(studentClass, rightX + 20, y);

    y += 15;

    (doc as any).autoTable({
        startY: y,
        head: [['Description', 'Term', 'Year', 'Amount']],
        body: [
            [payment.feeType, `Term ${payment.term}`, payment.year.toString(), formatCurrency(payment.amountPaid)]
        ],
        theme: 'grid',
        headStyles: { fillColor: [0, 82, 204], fontSize: 9 },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 45, halign: 'right' }
        }
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Method: ${payment.paymentMethod || 'Cash'}`, leftX, y);

    y += 8;
    doc.text(`Amount Due: ${formatCurrency(payment.amountDue)}`, leftX, y);
    doc.text(`Amount Paid: ${formatCurrency(payment.amountPaid)}`, rightX, y);

    y += 8;
    const balance = (payment.amountDue || 0) - (payment.amountPaid || 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Balance: ${formatCurrency(balance)}`, leftX, y);

    y += 15;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('This is a computer-generated receipt. Thank you for your payment.', pageWidth / 2, y, { align: 'center' });

    doc.save(`Receipt_${studentName.replace(/\s+/g, '_')}_${payment.feeType}_Term${payment.term}.pdf`);
};

export const generateStudentBalancesReport = (
    payments: FeePayment[],
    students: Student[],
    config: ReportConfig,
    term: number,
    year: number,
    selectedClass: string
) => {
    const doc = new jsPDF();

    const classLabel = selectedClass === 'All' ? 'All Classes' : selectedClass;
    let y = addReportHeader(doc, `Student Fee Balances - ${classLabel} - Term ${term}, ${year}`, config);

    const getStudentIdsForClass = () => {
        if (selectedClass === 'All') return new Set(students.map(s => s.id));
        return new Set(students.filter(s => s.classLevel === selectedClass).map(s => s.id));
    };
    const studentIds = getStudentIdsForClass();
    const filteredPayments = payments.filter(p =>
        p.term === term && p.year === year &&
        (selectedClass === 'All' || studentIds.has(p.studentId!))
    );

    const studentFeeMap: { [studentId: number]: { [feeType: string]: { due: number; paid: number } } } = {};

    filteredPayments.forEach(p => {
        if (!p.studentId) return;
        if (!studentFeeMap[p.studentId]) {
            studentFeeMap[p.studentId] = {};
        }
        if (!studentFeeMap[p.studentId][p.feeType]) {
            studentFeeMap[p.studentId][p.feeType] = { due: 0, paid: 0 };
        }
        studentFeeMap[p.studentId][p.feeType].due += p.amountDue || 0;
        studentFeeMap[p.studentId][p.feeType].paid += p.amountPaid || 0;
    });

    const tableData: string[][] = [];
    let grandTotalDue = 0;
    let grandTotalPaid = 0;
    let grandTotalBalance = 0;

    Object.entries(studentFeeMap).forEach(([studentIdStr, feeData]) => {
        const studentId = parseInt(studentIdStr);
        const student = students.find(s => s.id === studentId);
        const studentName = student?.name || 'Unknown';
        const studentClass = student?.classLevel || '-';

        let studentTotalDue = 0;
        let studentTotalPaid = 0;

        const feeDetails: string[] = [];

        Object.entries(feeData).forEach(([feeType, amounts]) => {
            studentTotalDue += amounts.due;
            studentTotalPaid += amounts.paid;
            const feeBalance = amounts.due - amounts.paid;
            if (feeBalance > 0) {
                feeDetails.push(`${feeType}: ${formatCurrency(feeBalance)}`);
            }
        });

        const studentBalance = studentTotalDue - studentTotalPaid;
        grandTotalDue += studentTotalDue;
        grandTotalPaid += studentTotalPaid;
        grandTotalBalance += studentBalance;

        tableData.push([
            studentName,
            studentClass,
            feeDetails.join('\n') || 'Fully Paid',
            formatCurrency(studentTotalDue),
            formatCurrency(studentTotalPaid),
            formatCurrency(studentBalance)
        ]);
    });

    tableData.sort((a, b) => {
        const balanceA = parseInt(a[5].replace(/[^0-9-]/g, '')) || 0;
        const balanceB = parseInt(b[5].replace(/[^0-9-]/g, '')) || 0;
        return balanceB - balanceA;
    });

    let rowNum = 1;
    const numberedData = tableData.map(row => [(rowNum++).toString(), ...row]);

    (doc as any).autoTable({
        startY: y,
        head: [['#', 'Student Name', 'Class', 'Fee Breakdown', 'Total Due', 'Total Paid', 'Balance']],
        body: numberedData,
        theme: 'striped',
        headStyles: { fillColor: [0, 82, 204], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 40 },
            2: { cellWidth: 15 },
            3: { cellWidth: 45 },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 25, halign: 'right' },
            6: { cellWidth: 25, halign: 'right' }
        }
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Students: ${tableData.length}`, 14, y);
    doc.text(`Total Due: ${formatCurrency(grandTotalDue)}`, 14, y + 6);
    doc.text(`Total Paid: ${formatCurrency(grandTotalPaid)}`, 14, y + 12);
    doc.text(`Total Outstanding: ${formatCurrency(grandTotalBalance)}`, 14, y + 18);

    doc.save(`Student_Fee_Balances_Term${term}_${year}.pdf`);
};

// --- Excel Exports ---

export const exportFeeCollectionExcel = (
    payments: FeePayment[],
    students: Student[],
    term: number,
    year: number,
    selectedClass: string
) => {
    const getStudentIdsForClass = () => {
        if (selectedClass === 'All') return new Set(students.map(s => s.id));
        return new Set(students.filter(s => s.classLevel === selectedClass).map(s => s.id));
    };
    const studentIds = getStudentIdsForClass();
    const filteredPayments = payments.filter(p =>
        p.term === term && p.year === year &&
        (selectedClass === 'All' || studentIds.has(p.studentId!))
    );

    const excelData = filteredPayments.map(p => {
        const student = students.find(s => s.id === p.studentId);
        return {
            'Date': formatDate(p.paymentDate || ''),
            'Student Name': student?.name || 'Unknown',
            'Class': student?.classLevel || '-',
            'Fee Type': p.feeType,
            'Amount Due': p.amountDue,
            'Amount Paid': p.amountPaid,
            'Balance': (p.amountDue || 0) - (p.amountPaid || 0),
            'Status': p.status || 'pending',
            'Payment Method': p.paymentMethod || '-',
            'Receipt Number': p.receiptNumber || '-'
        };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [
        { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 20 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
        { wch: 15 }, { wch: 18 }
    ];

    const wb = XLSX.utils.book_new();
    const classLabel = selectedClass === 'All' ? 'All' : selectedClass;
    XLSX.utils.book_append_sheet(wb, ws, `Fee_Collection_${classLabel}`);
    XLSX.writeFile(wb, `Fee_Collection_${classLabel}_Term${term}_${year}.xlsx`);
};

export const exportExpenseExcel = (
    expenses: Expense[],
    categories: ExpenseCategory[],
    dateFrom: string | undefined,
    dateTo: string | undefined
) => {
    let filteredExpenses = expenses;
    if (dateFrom) filteredExpenses = filteredExpenses.filter(e => e.expenseDate >= dateFrom);
    if (dateTo) filteredExpenses = filteredExpenses.filter(e => e.expenseDate <= dateTo);

    const getCategoryName = (id: number) => categories.find(c => c.id === id)?.name || 'Uncategorized';

    const excelData = filteredExpenses.map(e => ({
        'Date': formatDate(e.expenseDate),
        'Category': getCategoryName(e.categoryId),
        'Description': e.description,
        'Vendor': e.vendorName || '-',
        'Receipt Number': e.receiptNumber || '-',
        'Amount': e.amount
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [
        { wch: 12 }, { wch: 20 }, { wch: 40 }, { wch: 25 }, { wch: 18 }, { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    XLSX.writeFile(wb, `Expense_Report_${dateFrom || 'all'}_to_${dateTo || 'present'}.xlsx`);
};

export const exportIncomeStatementExcel = (
    payments: FeePayment[],
    expenses: Expense[],
    categories: ExpenseCategory[],
    term: number,
    year: number
) => {
    const filteredPayments = payments.filter(p =>
        p.term === term && p.year === year
    );
    const yearExpenses = expenses.filter(e => {
        const expYear = new Date(e.expenseDate).getFullYear();
        return expYear === year;
    });

    const revenueByType: { [key: string]: number } = {};
    filteredPayments.forEach(p => {
        if (!revenueByType[p.feeType]) revenueByType[p.feeType] = 0;
        revenueByType[p.feeType] += p.amountPaid || 0;
    });

    const getCategoryName = (id: number) => categories.find(c => c.id === id)?.name || 'Uncategorized';

    const expenseByCategory: { [key: string]: number } = {};
    yearExpenses.forEach(e => {
        const catName = getCategoryName(e.categoryId);
        if (!expenseByCategory[catName]) expenseByCategory[catName] = 0;
        expenseByCategory[catName] += e.amount || 0;
    });

    const totalRevenue = Object.values(revenueByType).reduce((a, b) => a + b, 0);
    const totalExpenses = Object.values(expenseByCategory).reduce((a, b) => a + b, 0);

    const revenueData = Object.entries(revenueByType).map(([type, amount]) => ({
        'Fee Type': type,
        'Amount': amount
    }));
    revenueData.push({ 'Fee Type': 'TOTAL REVENUE', 'Amount': totalRevenue });

    const expenseData = Object.entries(expenseByCategory).map(([cat, amount]) => ({
        'Category': cat,
        'Amount': amount
    }));
    expenseData.push({ 'Category': 'TOTAL EXPENSES', 'Amount': totalExpenses });

    const summaryData = [
        { 'Item': 'Total Revenue', 'Amount': totalRevenue },
        { 'Item': 'Total Expenses', 'Amount': totalExpenses },
        { 'Item': 'Net Income', 'Amount': totalRevenue - totalExpenses }
    ];

    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 20 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    const wsRevenue = XLSX.utils.json_to_sheet(revenueData);
    wsRevenue['!cols'] = [{ wch: 30 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsRevenue, 'Revenue');

    const wsExpense = XLSX.utils.json_to_sheet(expenseData);
    wsExpense['!cols'] = [{ wch: 30 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsExpense, 'Expenses');

    XLSX.writeFile(wb, `Income_Statement_Term${term}_${year}.xlsx`);
};

export const exportOutstandingFeesExcel = (
    payments: FeePayment[],
    students: Student[],
    term: number,
    year: number,
    selectedClass: string
) => {
    const getStudentIdsForClass = () => {
        if (selectedClass === 'All') return new Set(students.map(s => s.id));
        return new Set(students.filter(s => s.classLevel === selectedClass).map(s => s.id));
    };
    const studentIds = getStudentIdsForClass();
    const filteredPayments = payments.filter(p =>
        p.term === term && p.year === year &&
        (selectedClass === 'All' || studentIds.has(p.studentId!))
    );

    const studentPaymentMap: { [studentId: number]: { due: number; paid: number } } = {};
    filteredPayments.forEach(p => {
        if (!p.studentId) return;
        if (!studentPaymentMap[p.studentId]) {
            studentPaymentMap[p.studentId] = { due: 0, paid: 0 };
        }
        studentPaymentMap[p.studentId].due += p.amountDue || 0;
        studentPaymentMap[p.studentId].paid += p.amountPaid || 0;
    });

    const excelData: any[] = [];
    Object.entries(studentPaymentMap).forEach(([studentIdStr, data]) => {
        const studentId = parseInt(studentIdStr);
        const balance = data.due - data.paid;

        if (balance > 0) {
            const student = students.find(s => s.id === studentId);
            excelData.push({
                'Student Name': student?.name || 'Unknown',
                'Class': student?.classLevel || '-',
                'Total Due': data.due,
                'Total Paid': data.paid,
                'Balance': balance
            });
        }
    });

    excelData.sort((a, b) => b.Balance - a.Balance);

    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    const classLabel = selectedClass === 'All' ? 'All' : selectedClass;
    XLSX.utils.book_append_sheet(wb, ws, 'Outstanding_Fees');
    XLSX.writeFile(wb, `Outstanding_Fees_${classLabel}_Term${term}_${year}.xlsx`);
};

export const exportStudentBalancesExcel = (
    payments: FeePayment[],
    students: Student[],
    term: number,
    year: number,
    selectedClass: string
) => {
    const getStudentIdsForClass = () => {
        if (selectedClass === 'All') return new Set(students.map(s => s.id));
        return new Set(students.filter(s => s.classLevel === selectedClass).map(s => s.id));
    };
    const studentIds = getStudentIdsForClass();

    const filteredPayments = payments.filter(p =>
        p.term === term && p.year === year &&
        (selectedClass === 'All' || studentIds.has(p.studentId!))
    );

    const studentFeeMap: { [studentId: number]: { [feeType: string]: { due: number; paid: number } } } = {};

    filteredPayments.forEach(p => {
        if (!p.studentId) return;
        if (!studentFeeMap[p.studentId]) {
            studentFeeMap[p.studentId] = {};
        }
        if (!studentFeeMap[p.studentId][p.feeType]) {
            studentFeeMap[p.studentId][p.feeType] = { due: 0, paid: 0 };
        }
        studentFeeMap[p.studentId][p.feeType].due += p.amountDue || 0;
        studentFeeMap[p.studentId][p.feeType].paid += p.amountPaid || 0;
    });

    const excelData: any[] = [];

    Object.entries(studentFeeMap).forEach(([studentIdStr, feeData]) => {
        const studentId = parseInt(studentIdStr);
        const student = students.find(s => s.id === studentId);
        const studentName = student?.name || 'Unknown';
        const studentClass = student?.classLevel || '-';

        let studentTotalDue = 0;
        let studentTotalPaid = 0;

        const feeDetails: string[] = [];
        Object.entries(feeData).forEach(([feeType, amounts]) => {
            studentTotalDue += amounts.due;
            studentTotalPaid += amounts.paid;
            const feeBalance = amounts.due - amounts.paid;
            feeDetails.push(`${feeType}: ${formatCurrency(feeBalance)}`);
        });

        excelData.push({
            'Student Name': studentName,
            'Class': studentClass,
            'Fee Breakdown': feeDetails.join('; '),
            'Total Due': studentTotalDue,
            'Total Paid': studentTotalPaid,
            'Balance': studentTotalDue - studentTotalPaid
        });
    });

    excelData.sort((a, b) => b.Balance - a.Balance);

    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    const classLabel = selectedClass === 'All' ? 'All' : selectedClass;
    XLSX.utils.book_append_sheet(wb, ws, 'Student_Balances');
    XLSX.writeFile(wb, `Student_Balances_${classLabel}_Term${term}_${year}.csv`);
};
