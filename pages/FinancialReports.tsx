import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/Button';
import { SchoolSettings, Student, FeeStructure, FeePayment } from '../types';
import * as XLSX from 'xlsx';

declare const jspdf: any;

interface Expense {
  id: number;
  amount: number;
  description: string;
  categoryId: number;
  expenseDate: string;
  vendorName?: string;
  receiptNumber?: string;
}

interface ExpenseCategory {
  id: number;
  name: string;
  color: string;
}

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalOutstanding: number;
  totalDue: number;
  netIncome: number;
  collectionRate: number;
}

type ReportType = 'fee-collection' | 'expense' | 'income-statement' | 'outstanding' | 'student-balances' | 'receipt';

export default function FinancialReports() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [selectedReport, setSelectedReport] = useState<ReportType>('fee-collection');
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);

  const classLevels = ['All', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

  const getStudentsForClass = () => {
    if (selectedClass === 'All') return students;
    return students.filter(s => s.classLevel === selectedClass);
  };

  const getStudentIdsForClass = () => {
    return new Set(getStudentsForClass().map(s => s.id));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, studentsRes, paymentsRes, expensesRes, categoriesRes, structuresRes] = await Promise.all([
        fetch('/api/settings', { credentials: 'include' }),
        fetch('/api/students', { credentials: 'include' }),
        fetch('/api/fee-payments', { credentials: 'include' }),
        fetch('/api/expenses', { credentials: 'include' }),
        fetch('/api/expense-categories', { credentials: 'include' }),
        fetch('/api/fee-structures', { credentials: 'include' })
      ]);

      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setSettings(s);
        setSelectedTerm(s.currentTerm || 1);
        setSelectedYear(s.currentYear || new Date().getFullYear());
      }
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (paymentsRes.ok) setPayments(await paymentsRes.json());
      if (expensesRes.ok) setExpenses(await expensesRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (structuresRes.ok) setFeeStructures(await structuresRes.json());
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStudentName = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return 'Unknown';
    return student.name || 'Unknown';
  };

  const getStudentClass = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    return student?.classLevel || '-';
  };

  const getCategoryName = (categoryId: number) => {
    return categories.find(c => c.id === categoryId)?.name || 'Uncategorized';
  };

  const addReportHeader = (doc: any, title: string, yPos: number = 20) => {
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(settings?.schoolName || 'School Name', pageWidth / 2, yPos, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (settings?.addressBox) {
      doc.text(settings.addressBox, pageWidth / 2, yPos + 6, { align: 'center' });
    }
    if (settings?.contactPhones) {
      doc.text(settings.contactPhones, pageWidth / 2, yPos + 11, { align: 'center' });
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, yPos + 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-UG')}`, pageWidth / 2, yPos + 26, { align: 'center' });

    return yPos + 35;
  };

  const generateFeeCollectionReport = () => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    const studentIds = getStudentIdsForClass();
    const filteredPayments = payments.filter(p =>
      p.term === selectedTerm && p.year === selectedYear &&
      (selectedClass === 'All' || studentIds.has(p.studentId!))
    );

    const classLabel = selectedClass === 'All' ? 'All Classes' : selectedClass;
    let y = addReportHeader(doc, `Fee Collection Report - ${classLabel} - Term ${selectedTerm}, ${selectedYear}`);

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

      const tableData = typePayments.map(p => [
        formatDate(p.paymentDate || ''),
        getStudentName(p.studentId!),
        getStudentClass(p.studentId!),
        formatCurrency(p.amountDue),
        formatCurrency(p.amountPaid),
        p.status || 'pending',
        p.paymentMethod || '-'
      ]);

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

    doc.save(`Fee_Collection_Report_Term${selectedTerm}_${selectedYear}.pdf`);
  };

  const generateExpenseReport = () => {
    const { jsPDF } = jspdf;
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

    let y = addReportHeader(doc, `Expense Report - ${dateRange}`);

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

  const generateIncomeStatement = () => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    const filteredPayments = payments.filter(p =>
      p.term === selectedTerm && p.year === selectedYear
    );

    const yearExpenses = expenses.filter(e => {
      const expYear = new Date(e.expenseDate).getFullYear();
      return expYear === selectedYear;
    });

    let y = addReportHeader(doc, `Income Statement - Term ${selectedTerm}, ${selectedYear}`);

    const revenueByType: { [key: string]: number } = {};
    filteredPayments.forEach(p => {
      if (!revenueByType[p.feeType]) revenueByType[p.feeType] = 0;
      revenueByType[p.feeType] += p.amountPaid || 0;
    });

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

    doc.save(`Income_Statement_Term${selectedTerm}_${selectedYear}.pdf`);
  };

  const generateOutstandingFeesReport = () => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    const classLabel = selectedClass === 'All' ? 'All Classes' : selectedClass;
    let y = addReportHeader(doc, `Outstanding Fees Report - ${classLabel} - Term ${selectedTerm}, ${selectedYear}`);

    const studentBalances: { studentId: number; name: string; classLevel: string; totalDue: number; totalPaid: number; balance: number }[] = [];

    const studentIds = getStudentIdsForClass();
    const filteredPayments = payments.filter(p =>
      p.term === selectedTerm && p.year === selectedYear &&
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
        const studentName = getStudentName(studentId);
        const studentClass = getStudentClass(studentId);

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

    doc.save(`Outstanding_Fees_Term${selectedTerm}_${selectedYear}.pdf`);
  };

  const generatePaymentReceipt = (paymentId: number) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    const { jsPDF } = jspdf;
    const doc = new jsPDF({ format: [210, 148] });

    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(settings?.schoolName || 'School Name', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (settings?.addressBox) {
      doc.text(settings.addressBox, pageWidth / 2, 21, { align: 'center' });
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
    doc.text(getStudentName(payment.studentId!), leftX + 30, y);

    doc.setFont('helvetica', 'normal');
    doc.text('Class:', rightX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(getStudentClass(payment.studentId!), rightX + 20, y);

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

    const studentName = getStudentName(payment.studentId!).replace(/\s+/g, '_');
    doc.save(`Receipt_${studentName}_${payment.feeType}_Term${payment.term}.pdf`);
  };

  const generateStudentBalancesReport = () => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    const classLabel = selectedClass === 'All' ? 'All Classes' : selectedClass;
    let y = addReportHeader(doc, `Student Fee Balances - ${classLabel} - Term ${selectedTerm}, ${selectedYear}`);

    const studentIds = getStudentIdsForClass();
    const filteredPayments = payments.filter(p =>
      p.term === selectedTerm && p.year === selectedYear &&
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
      const studentName = getStudentName(studentId);
      const studentClass = getStudentClass(studentId);

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

    doc.save(`Student_Fee_Balances_Term${selectedTerm}_${selectedYear}.pdf`);
  };

  const handleGenerateReport = () => {
    setGenerating(true);
    try {
      switch (selectedReport) {
        case 'fee-collection':
          generateFeeCollectionReport();
          break;
        case 'expense':
          generateExpenseReport();
          break;
        case 'income-statement':
          generateIncomeStatement();
          break;
        case 'outstanding':
          generateOutstandingFeesReport();
          break;
        case 'student-balances':
          generateStudentBalancesReport();
          break;
        case 'receipt':
          if (selectedPaymentId) {
            generatePaymentReceipt(selectedPaymentId);
          }
          break;
      }
    } catch (err) {
      console.error('Failed to generate report', err);
    }
    setGenerating(false);
  };

  const exportToExcel = () => {
    try {
      switch (selectedReport) {
        case 'fee-collection':
          exportFeeCollectionExcel();
          break;
        case 'expense':
          exportExpenseExcel();
          break;
        case 'income-statement':
          exportIncomeStatementExcel();
          break;
        case 'outstanding':
          exportOutstandingFeesExcel();
          break;
        case 'student-balances':
          exportStudentBalancesExcel();
          break;
        default:
          alert('Excel export not available for this report type');
      }
    } catch (err) {
      console.error('Failed to export to Excel', err);
      alert('Failed to export to Excel');
    }
  };

  const exportFeeCollectionExcel = () => {
    const studentIds = getStudentIdsForClass();
    const filteredPayments = payments.filter(p =>
      p.term === selectedTerm && p.year === selectedYear &&
      (selectedClass === 'All' || studentIds.has(p.studentId!))
    );

    const excelData = filteredPayments.map(p => ({
      'Date': formatDate(p.paymentDate || ''),
      'Student Name': getStudentName(p.studentId!),
      'Class': getStudentClass(p.studentId!),
      'Fee Type': p.feeType,
      'Amount Due': p.amountDue,
      'Amount Paid': p.amountPaid,
      'Balance': (p.amountDue || 0) - (p.amountPaid || 0),
      'Status': p.status || 'pending',
      'Payment Method': p.paymentMethod || '-',
      'Receipt Number': p.receiptNumber || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [
      { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 20 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
      { wch: 15 }, { wch: 18 }
    ];

    const wb = XLSX.utils.book_new();
    const classLabel = selectedClass === 'All' ? 'All' : selectedClass;
    XLSX.utils.book_append_sheet(wb, ws, `Fee_Collection_${classLabel}`);
    XLSX.writeFile(wb, `Fee_Collection_${classLabel}_Term${selectedTerm}_${selectedYear}.xlsx`);
  };

  const exportExpenseExcel = () => {
    let filteredExpenses = expenses;
    if (dateFrom) filteredExpenses = filteredExpenses.filter(e => e.expenseDate >= dateFrom);
    if (dateTo) filteredExpenses = filteredExpenses.filter(e => e.expenseDate <= dateTo);

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

  const exportIncomeStatementExcel = () => {
    const filteredPayments = payments.filter(p =>
      p.term === selectedTerm && p.year === selectedYear
    );
    const yearExpenses = expenses.filter(e => {
      const expYear = new Date(e.expenseDate).getFullYear();
      return expYear === selectedYear;
    });

    // Revenue summary
    const revenueByType: { [key: string]: number } = {};
    filteredPayments.forEach(p => {
      if (!revenueByType[p.feeType]) revenueByType[p.feeType] = 0;
      revenueByType[p.feeType] += p.amountPaid || 0;
    });

    // Expense summary
    const expenseByCategory: { [key: string]: number } = {};
    yearExpenses.forEach(e => {
      const catName = getCategoryName(e.categoryId);
      if (!expenseByCategory[catName]) expenseByCategory[catName] = 0;
      expenseByCategory[catName] += e.amount || 0;
    });

    const totalRevenue = Object.values(revenueByType).reduce((a, b) => a + b, 0);
    const totalExpenses = Object.values(expenseByCategory).reduce((a, b) => a + b, 0);

    // Create revenue sheet
    const revenueData = Object.entries(revenueByType).map(([type, amount]) => ({
      'Fee Type': type,
      'Amount': amount
    }));
    revenueData.push({ 'Fee Type': 'TOTAL REVENUE', 'Amount': totalRevenue });

    // Create expense sheet
    const expenseData = Object.entries(expenseByCategory).map(([cat, amount]) => ({
      'Category': cat,
      'Amount': amount
    }));
    expenseData.push({ 'Category': 'TOTAL EXPENSES', 'Amount': totalExpenses });

    // Create summary sheet
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

    XLSX.writeFile(wb, `Income_Statement_Term${selectedTerm}_${selectedYear}.xlsx`);
  };

  const exportOutstandingFeesExcel = () => {
    const studentIds = getStudentIdsForClass();
    const filteredPayments = payments.filter(p =>
      p.term === selectedTerm && p.year === selectedYear &&
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
        excelData.push({
          'Student Name': getStudentName(studentId),
          'Class': getStudentClass(studentId),
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
    XLSX.writeFile(wb, `Outstanding_Fees_${classLabel}_Term${selectedTerm}_${selectedYear}.xlsx`);
  };

  const exportStudentBalancesExcel = () => {
    const studentIds = getStudentIdsForClass();
    const filteredPayments = payments.filter(p =>
      p.term === selectedTerm && p.year === selectedYear &&
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
      const studentName = getStudentName(studentId);
      const studentClass = getStudentClass(studentId);

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
    XLSX.writeFile(wb, `Student_Balances_${classLabel}_Term${selectedTerm}_${selectedYear}.csv`);
  };

  const exportToCSV = () => {
    let csvContent = '';
    let fileName = '';

    try {
      switch (selectedReport) {
        case 'fee-collection': {
          const studentIds = getStudentIdsForClass();
          const filteredPayments = payments.filter(p =>
            p.term === selectedTerm && p.year === selectedYear &&
            (selectedClass === 'All' || studentIds.has(p.studentId!))
          );

          const headers = ['Date', 'Student Name', 'Class', 'Fee Type', 'Amount Due', 'Amount Paid', 'Balance', 'Status', 'Payment Method', 'Receipt Number'];
          const rows = filteredPayments.map(p => [
            formatDate(p.paymentDate || ''),
            getStudentName(p.studentId!),
            getStudentClass(p.studentId!),
            p.feeType,
            p.amountDue,
            p.amountPaid,
            (p.amountDue || 0) - (p.amountPaid || 0),
            p.status || 'pending',
            p.paymentMethod || '-',
            p.receiptNumber || '-'
          ]);

          csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
          fileName = `Fee_Collection_${selectedClass}_Term${selectedTerm}_${selectedYear}.csv`;
          break;
        }

        case 'expense': {
          let filteredExpenses = expenses;
          if (dateFrom) filteredExpenses = filteredExpenses.filter(e => e.expenseDate >= dateFrom);
          if (dateTo) filteredExpenses = filteredExpenses.filter(e => e.expenseDate <= dateTo);

          const headers = ['Date', 'Category', 'Description', 'Vendor', 'Receipt Number', 'Amount'];
          const rows = filteredExpenses.map(e => [
            formatDate(e.expenseDate),
            getCategoryName(e.categoryId),
            `"${e.description.replace(/"/g, '""')}"`,
            e.vendorName || '-',
            e.receiptNumber || '-',
            e.amount
          ]);

          csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
          fileName = `Expense_Report_${dateFrom || 'all'}_to_${dateTo || 'present'}.csv`;
          break;
        }

        case 'outstanding': {
          const studentIds = getStudentIdsForClass();
          const filteredPayments = payments.filter(p =>
            p.term === selectedTerm && p.year === selectedYear &&
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

          const headers = ['Student Name', 'Class', 'Total Due', 'Total Paid', 'Balance'];
          const rows: any[] = [];
          Object.entries(studentPaymentMap).forEach(([studentIdStr, data]) => {
            const studentId = parseInt(studentIdStr);
            const balance = data.due - data.paid;

            if (balance > 0) {
              rows.push([
                getStudentName(studentId),
                getStudentClass(studentId),
                data.due,
                data.paid,
                balance
              ]);
            }
          });

          rows.sort((a, b) => b[4] - a[4]);
          csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
          fileName = `Outstanding_Fees_${selectedClass}_Term${selectedTerm}_${selectedYear}.csv`;
          break;
        }

        default:
          alert('CSV export not available for this report type');
          return;
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export to CSV', err);
      alert('Failed to export to CSV');
    }
  };

  const reports = [
    { id: 'fee-collection' as ReportType, name: 'Fee Collection Report', icon: '💰', description: 'All payments by term/year with totals' },
    { id: 'expense' as ReportType, name: 'Expense Report', icon: '📊', description: 'Expenses by category with date range' },
    { id: 'income-statement' as ReportType, name: 'Income Statement', icon: '📈', description: 'Revenue vs expenses summary' },
    { id: 'outstanding' as ReportType, name: 'Outstanding Fees', icon: '⚠️', description: 'Students with unpaid balances only' },
    { id: 'student-balances' as ReportType, name: 'Student Fee Balances', icon: '📋', description: 'All students with detailed fee breakdown' },
    { id: 'receipt' as ReportType, name: 'Payment Receipt', icon: '🧾', description: 'Individual payment receipts' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isDark ? 'text-white' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Financial Reports</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Generate and download financial reports</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/app/finance')}>
          Back to Finance
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-1 rounded-lg shadow-sm border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Select Report</h2>
          <div className="space-y-2">
            {reports.map(report => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedReport === report.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{report.icon}</span>
                  <div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{report.name}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{report.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={`lg:col-span-2 rounded-lg shadow-sm border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Report Options</h2>

          {(selectedReport === 'fee-collection' || selectedReport === 'income-statement' || selectedReport === 'outstanding' || selectedReport === 'student-balances') && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Term</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(parseInt(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                >
                  <option value={1}>Term 1</option>
                  <option value={2}>Term 2</option>
                  <option value={3}>Term 3</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Year</label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                >
                  {classLevels.map(cl => (
                    <option key={cl} value={cl}>{cl === 'All' ? 'All Classes' : cl}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {selectedReport === 'expense' && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
              </div>
            </div>
          )}

          {selectedReport === 'receipt' && (
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Select Payment</label>
              <select
                value={selectedPaymentId || ''}
                onChange={(e) => setSelectedPaymentId(parseInt(e.target.value) || null)}
                className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              >
                <option value="">-- Select a payment --</option>
                {payments.slice(0, 50).map(p => (
                  <option key={p.id} value={p.id}>
                    {getStudentName(p.studentId!)} - {p.feeType} - Term {p.term}, {p.year} - {formatCurrency(p.amountPaid)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
            <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Report Preview</h3>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {selectedReport === 'fee-collection' && (
                <p>This report will show all fee payments for {selectedClass === 'All' ? 'all classes' : selectedClass}, Term {selectedTerm}, {selectedYear}, grouped by fee type with subtotals.</p>
              )}
              {selectedReport === 'expense' && (
                <p>This report will list all expenses{dateFrom || dateTo ? ` from ${dateFrom || 'start'} to ${dateTo || 'present'}` : ''}, grouped by category.</p>
              )}
              {selectedReport === 'income-statement' && (
                <p>This report will show revenue vs expenses for Term {selectedTerm}, {selectedYear}, with net income calculation.</p>
              )}
              {selectedReport === 'outstanding' && (
                <p>This report will list only students with unpaid balances for {selectedClass === 'All' ? 'all classes' : selectedClass}, Term {selectedTerm}, {selectedYear}, sorted by amount owed.</p>
              )}
              {selectedReport === 'student-balances' && (
                <p>This report shows ALL students with payment records for {selectedClass === 'All' ? 'all classes' : selectedClass}, Term {selectedTerm}, {selectedYear}, with detailed fee breakdown showing what each student owes.</p>
              )}
              {selectedReport === 'receipt' && (
                <p>Generate a printable receipt for a specific payment transaction.</p>
              )}
            </div>
          </div>

          <Button
            onClick={handleGenerateReport}
            disabled={generating || (selectedReport === 'receipt' && !selectedPaymentId)}
            className="w-full"
          >
            {generating ? 'Generating...' : 'Generate & Download PDF'}
          </Button>

          <button
            onClick={exportToExcel}
            disabled={selectedReport === 'receipt'}
            className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-3 ${selectedReport === 'receipt'
              ? isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : isDark ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20' : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20'
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to Excel
          </button>
        </div>
      </div>
    </div>
  );
}
