import { Router } from "express";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { students, teachers, marks, schools, feePayments, expenses, gateAttendance, financeTransactions } from "../../shared/schema";
import { requireAuth, getActiveSchoolId } from "../auth";

export const dashboardRoutes = Router();

// GET /api/dashboard/stats
dashboardRoutes.get("/stats", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const today = new Date().toISOString().split('T')[0];

        const studentCount = await db.select({ count: sql<number>`count(*)` }).from(students)
            .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)));
        const teacherCount = await db.select({ count: sql<number>`count(*)` }).from(teachers)
            .where(and(eq(teachers.schoolId, schoolId), eq(teachers.isActive, true)));
        const attendance = await db.select({ count: sql<number>`count(*)` }).from(gateAttendance)
            .where(and(eq(gateAttendance.schoolId, schoolId), eq(gateAttendance.date, today), eq(gateAttendance.status, 'present')));

        const finStats = await db.select({
            totalCredits: sql<number>`SUM(CASE WHEN ${financeTransactions.transactionType} = 'credit' THEN ${financeTransactions.amount} ELSE 0 END)`,
            totalDebits: sql<number>`SUM(CASE WHEN ${financeTransactions.transactionType} = 'debit' THEN ${financeTransactions.amount} ELSE 0 END)`,
        }).from(financeTransactions).where(eq(financeTransactions.schoolId, schoolId));

        const totalRevenue = Number(finStats[0].totalCredits || 0);
        const totalInvoiced = Number(finStats[0].totalDebits || 0);
        const outstanding = totalInvoiced - totalRevenue;
        const collectionRate = totalInvoiced > 0 ? Math.round((totalRevenue / totalInvoiced) * 100) : 0;

        res.json({
            students: { total: Number(studentCount[0].count), present: Number(attendance[0].count) },
            teachers: { total: Number(teacherCount[0].count) },
            revenue: { total: totalRevenue, outstanding, collectionRate },
            attendance: { rate: Number(studentCount[0].count) > 0 ? Math.round((Number(attendance[0].count) / Number(studentCount[0].count)) * 100) : 0 }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/dashboard/revenue-trends
dashboardRoutes.get("/revenue-trends", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const payments = await db.select({ date: feePayments.paymentDate, amount: feePayments.amountPaid })
            .from(feePayments).where(and(eq(feePayments.schoolId, schoolId), eq(feePayments.isDeleted, false)));
        const expenseRecords = await db.select({ date: expenses.expenseDate, amount: expenses.amount })
            .from(expenses).where(eq(expenses.schoolId, schoolId));

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const revenueMap: Record<string, number> = {};
        const expenseMap: Record<string, number> = {};
        months.forEach(m => { revenueMap[m] = 0; expenseMap[m] = 0; });

        payments.forEach(p => {
            if (p.date) {
                const date = new Date(p.date);
                if (!isNaN(date.getTime())) {
                    const month = months[date.getMonth()];
                    revenueMap[month] = (revenueMap[month] || 0) + Number(p.amount);
                }
            }
        });
        expenseRecords.forEach(e => {
            if (e.date) {
                const date = new Date(e.date);
                if (!isNaN(date.getTime())) {
                    const month = months[date.getMonth()];
                    expenseMap[month] = (expenseMap[month] || 0) + Number(e.amount);
                }
            }
        });

        res.json(months.map(name => ({ name, revenue: revenueMap[name] || 0, expenses: expenseMap[name] || 0 })));
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch revenue trends" });
    }
});

// GET /api/dashboard/demographics
dashboardRoutes.get("/demographics", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const boys = await db.select({ count: sql<number>`count(*)` }).from(students)
            .where(and(eq(students.schoolId, schoolId), eq(students.gender, 'M'), eq(students.isActive, true)));
        const girls = await db.select({ count: sql<number>`count(*)` }).from(students)
            .where(and(eq(students.schoolId, schoolId), eq(students.gender, 'F'), eq(students.isActive, true)));

        res.json({ gender: [{ name: 'Male', value: Number(boys[0].count) }, { name: 'Female', value: Number(girls[0].count) }] });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/dashboard/academic-performance
dashboardRoutes.get("/academic-performance", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const school = await db.query.schools.findFirst({ where: eq(schools.id, schoolId) });
        if (!school) return res.status(404).json({ message: "School not found" });

        const currentTerm = school.currentTerm || 1;
        const currentYear = school.currentYear || new Date().getFullYear();

        const allMarks = await db.select().from(marks)
            .where(and(eq(marks.schoolId, schoolId), eq(marks.term, currentTerm), eq(marks.year, currentYear)));

        const subjects = ['english', 'maths', 'science', 'sst', 'literacy1', 'literacy2'];
        const totals: Record<string, { sum: number, count: number }> = {};
        subjects.forEach(sub => totals[sub] = { sum: 0, count: 0 });

        allMarks.forEach(record => {
            const m = record.marks as any;
            if (m) {
                subjects.forEach(sub => {
                    const val = m[sub];
                    if (typeof val === 'number') { totals[sub].sum += val; totals[sub].count++; }
                });
            }
        });

        const data = subjects.map(sub => ({
            subject: sub.charAt(0).toUpperCase() + sub.slice(1),
            average: totals[sub].count > 0 ? Math.round(totals[sub].sum / totals[sub].count) : 0
        })).filter(d => d.average > 0);

        res.json(data);
    } catch (error: any) {
        console.error("Academic performance error:", error);
        res.status(500).json({ message: error.message });
    }
});

// GET /api/dashboard/upcoming-events
dashboardRoutes.get("/upcoming-events", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const allStudents = await db.select({ name: students.name, dob: students.dateOfBirth }).from(students)
            .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)));

        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const birthdays = allStudents.filter(s => {
            if (!s.dob) return false;
            const d = new Date(s.dob);
            const currentYearDob = new Date(today.getFullYear(), d.getMonth(), d.getDate());
            return currentYearDob >= today && currentYearDob <= nextWeek;
        }).map(s => ({
            title: `${s.name} 's Birthday`,
            date: new Date(today.getFullYear(), new Date(s.dob!).getMonth(), new Date(s.dob!).getDate()).toISOString(),
            type: 'birthday'
        })).slice(0, 5);

        res.json(birthdays);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});
