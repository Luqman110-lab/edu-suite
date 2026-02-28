import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { students, teachers, marks, schools, feePayments, expenses, gateAttendance, financeTransactions, teacherAttendance, schoolEvents } from "../../shared/schema";

export class DashboardService {

    async getStats(schoolId: number) {
        const school = await db.query.schools.findFirst({ where: eq(schools.id, schoolId) });
        if (!school) throw new Error("School not found");
        const currentTerm = school.currentTerm || 1;
        const currentYear = school.currentYear || new Date().getFullYear();
        const today = new Date().toISOString().split('T')[0];

        const studentCount = await db.select({ count: sql<number>`count(*)` }).from(students)
            .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)));
        let teacherCount;
        try {
            teacherCount = await db.select({ count: sql<number>`count(*)` }).from(teachers)
                .where(and(eq(teachers.schoolId, schoolId), eq(teachers.isActive, true)));
        } catch (e) {
            teacherCount = await db.select({ count: sql<number>`count(*)` }).from(teachers)
                .where(eq(teachers.schoolId, schoolId));
        }

        const attendance = await db.select({ count: sql<number>`count(*)` }).from(gateAttendance)
            .where(and(eq(gateAttendance.schoolId, schoolId), eq(gateAttendance.date, today), sql`${gateAttendance.status} IN ('present', 'late', 'half_day')`));
        const studentLate = await db.select({ count: sql<number>`count(*)` }).from(gateAttendance)
            .where(and(eq(gateAttendance.schoolId, schoolId), eq(gateAttendance.date, today), eq(gateAttendance.status, 'late')));

        const teacherPresentResult = await db.select({ count: sql<number>`count(*)` }).from(teacherAttendance)
            .where(and(eq(teacherAttendance.schoolId, schoolId), eq(teacherAttendance.date, today), sql`${teacherAttendance.status} IN ('present', 'late', 'half_day')`));
        const teacherLateResult = await db.select({ count: sql<number>`count(*)` }).from(teacherAttendance)
            .where(and(eq(teacherAttendance.schoolId, schoolId), eq(teacherAttendance.date, today), eq(teacherAttendance.status, 'late')));

        const studentBalances = await db.select({
            studentId: financeTransactions.studentId,
            totalCredits: sql<number>`SUM(CASE WHEN ${financeTransactions.transactionType} = 'credit' THEN ${financeTransactions.amount} ELSE 0 END)`,
            totalDebits: sql<number>`SUM(CASE WHEN ${financeTransactions.transactionType} = 'debit' THEN ${financeTransactions.amount} ELSE 0 END)`,
        }).from(financeTransactions).where(and(
            eq(financeTransactions.schoolId, schoolId),
            eq(financeTransactions.term, currentTerm),
            eq(financeTransactions.year, currentYear)
        )).groupBy(financeTransactions.studentId);

        let debtorsCount = 0;
        let totalRevenue = 0;
        let totalInvoiced = 0;

        studentBalances.forEach(record => {
            const debits = Number(record.totalDebits || 0);
            const credits = Number(record.totalCredits || 0);
            totalInvoiced += debits;
            totalRevenue += credits;
            if (debits - credits > 0) debtorsCount++;
        });

        const outstanding = totalInvoiced - totalRevenue;
        const collectionRate = totalInvoiced > 0 ? Math.round((totalRevenue / totalInvoiced) * 100) : 0;

        const studentTotal = Number(studentCount[0].count);
        const studentPresent = Number(attendance[0].count);
        const teacherTotal = Number(teacherCount[0].count);
        const teacherPresent = Number(teacherPresentResult[0].count);

        return {
            students: { total: studentTotal, present: studentPresent, absent: Math.max(0, studentTotal - studentPresent), late: Number(studentLate[0].count) },
            teachers: { total: teacherTotal, present: teacherPresent, absent: Math.max(0, teacherTotal - teacherPresent), late: Number(teacherLateResult[0].count) },
            revenue: { total: totalRevenue, outstanding, collectionRate, invoiced: totalInvoiced, debtors: debtorsCount },
            attendance: { rate: studentTotal > 0 ? Math.round((studentPresent / studentTotal) * 100) : 0 }
        };
    }

    async getRevenueTrends(schoolId: number) {
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

        return months.map(name => ({ name, revenue: revenueMap[name] || 0, expenses: expenseMap[name] || 0 }));
    }

    async getDemographics(schoolId: number) {
        const boys = await db.select({ count: sql<number>`count(*)` }).from(students)
            .where(and(eq(students.schoolId, schoolId), eq(students.gender, 'M'), eq(students.isActive, true)));
        const girls = await db.select({ count: sql<number>`count(*)` }).from(students)
            .where(and(eq(students.schoolId, schoolId), eq(students.gender, 'F'), eq(students.isActive, true)));

        return { gender: [{ name: 'Male', value: Number(boys[0].count) }, { name: 'Female', value: Number(girls[0].count) }] };
    }

    async getAcademicPerformance(schoolId: number) {
        const school = await db.query.schools.findFirst({ where: eq(schools.id, schoolId) });
        if (!school) throw new Error("School not found");

        const currentTerm = school.currentTerm || 1;
        const currentYear = school.currentYear || new Date().getFullYear();

        const subjects = ['english', 'maths', 'science', 'sst', 'literacy1', 'literacy2'];

        // Safely extract JSON keys and cast to numeric, but strictly use Regex to ensure no empty strings or letters crash the transaction
        const safeAvg = (field: string) => sql<number>`AVG(
            CASE 
                WHEN marks->>${field} ~ '^[0-9]+(\.[0-9]+)?$' 
                THEN NULLIF((marks->>${field})::numeric, 0) 
                ELSE NULL 
            END
        )`;

        const stats = await db.select({
            englishAvg: safeAvg('english'),
            mathsAvg: safeAvg('maths'),
            scienceAvg: safeAvg('science'),
            sstAvg: safeAvg('sst'),
            literacy1Avg: safeAvg('literacy1'),
            literacy2Avg: safeAvg('literacy2')
        }).from(marks)
            .where(and(eq(marks.schoolId, schoolId), eq(marks.term, currentTerm), eq(marks.year, currentYear)));

        const result = stats[0];

        const mapped = [
            { subject: 'English', average: Math.round(Number(result.englishAvg) || 0) },
            { subject: 'Maths', average: Math.round(Number(result.mathsAvg) || 0) },
            { subject: 'Science', average: Math.round(Number(result.scienceAvg) || 0) },
            { subject: 'Sst', average: Math.round(Number(result.sstAvg) || 0) },
            { subject: 'Literacy1', average: Math.round(Number(result.literacy1Avg) || 0) },
            { subject: 'Literacy2', average: Math.round(Number(result.literacy2Avg) || 0) }
        ];

        return mapped.filter(d => d.average > 0);
    }

    async getUpcomingEvents(schoolId: number) {
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
            title: `${s.name}'s Birthday`,
            date: new Date(today.getFullYear(), new Date(s.dob!).getMonth(), new Date(s.dob!).getDate()).toISOString(),
            type: 'birthday',
            startTime: 'All Day',
            endTime: ''
        })).slice(0, 5);

        const todayStr = today.toISOString().split('T')[0];
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        let upcomingSchoolEvents;
        try {
            upcomingSchoolEvents = await db.select().from(schoolEvents)
                .where(and(
                    eq(schoolEvents.schoolId, schoolId),
                    eq(schoolEvents.isActive, true),
                    sql`${schoolEvents.startDate} >= ${todayStr}`,
                    sql`${schoolEvents.startDate} <= ${nextWeekStr}`
                ));
        } catch (e) {
            // Fallback: query without isActive filter (column may not exist in DB yet)
            upcomingSchoolEvents = await db.select().from(schoolEvents)
                .where(and(
                    eq(schoolEvents.schoolId, schoolId),
                    sql`${schoolEvents.startDate} >= ${todayStr}`,
                    sql`${schoolEvents.startDate} <= ${nextWeekStr}`
                ));
        }

        const eventsMapped = upcomingSchoolEvents.map(e => ({
            title: e.name,
            date: new Date(e.startDate).toISOString(),
            type: e.eventType,
            startTime: e.startTime || 'All Day',
            endTime: e.endTime || ''
        }));

        return [...eventsMapped, ...birthdays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 10);
    }

    async getDivisionDistribution(schoolId: number) {
        const school = await db.query.schools.findFirst({ where: eq(schools.id, schoolId) });
        if (!school) throw new Error("School not found");

        const currentTerm = school.currentTerm || 1;
        const currentYear = school.currentYear || new Date().getFullYear();

        const distStats = await db.select({
            division: sql<string>`COALESCE(${marks.division}, 'X')`,
            count: sql<number>`count(*)::int`
        }).from(marks)
            .where(and(eq(marks.schoolId, schoolId), eq(marks.term, currentTerm), eq(marks.year, currentYear)))
            .groupBy(sql`COALESCE(${marks.division}, 'X')`);

        return distStats.map(d => ({ division: d.division, count: Number(d.count) })).filter(d => d.count > 0);
    }

    async getClassPerformance(schoolId: number) {
        const school = await db.query.schools.findFirst({ where: eq(schools.id, schoolId) });
        if (!school) throw new Error("School not found");

        const currentTerm = school.currentTerm || 1;
        const currentYear = school.currentYear || new Date().getFullYear();

        const classTotals = await db.select({
            classLevel: students.classLevel,
            avgAggregate: sql<number>`AVG(COALESCE(${marks.aggregate}, 0))`
        }).from(marks).innerJoin(students, eq(marks.studentId, students.id))
            .where(and(eq(marks.schoolId, schoolId), eq(marks.term, currentTerm), eq(marks.year, currentYear)))
            .groupBy(students.classLevel);

        return classTotals.map(data => ({
            class: data.classLevel,
            avgAggregate: Math.round(Number(data.avgAggregate) * 10) / 10
        })).sort((a, b) => a.class.localeCompare(b.class));
    }

    async getAlerts(schoolId: number) {
        const alerts: any[] = [];
        const today = new Date().toISOString().split('T')[0];

        // 1. Absent Teachers Setup
        const teacherPresentResult = await db.select({ teacherId: teacherAttendance.teacherId }).from(teacherAttendance)
            .where(and(eq(teacherAttendance.schoolId, schoolId), eq(teacherAttendance.date, today), sql`${teacherAttendance.status} IN ('present', 'late', 'half_day')`));

        const presentTeacherIds = teacherPresentResult.map(t => t.teacherId);
        let allActiveTeachers;
        try {
            allActiveTeachers = await db.select({ id: teachers.id, name: teachers.name }).from(teachers)
                .where(and(eq(teachers.schoolId, schoolId), eq(teachers.isActive, true)));
        } catch (e) {
            allActiveTeachers = await db.select({ id: teachers.id, name: teachers.name }).from(teachers)
                .where(eq(teachers.schoolId, schoolId));
        }

        const absentTeachers = allActiveTeachers.filter(t => !presentTeacherIds.includes(t.id));

        if (absentTeachers.length > 0) {
            alerts.push({
                severity: 'critical',
                type: 'teacher_absent',
                message: `${absentTeachers.length} teachers absent today`,
                detail: absentTeachers.map(t => t.name).join(', '),
                action: '/app/teachers'
            });
        }

        // 2. High Debtors Alert
        const school = await db.query.schools.findFirst({ where: eq(schools.id, schoolId) });
        if (school) {
            const currentTerm = school.currentTerm || 1;
            const currentYear = school.currentYear || new Date().getFullYear();

            const studentBalances = await db.select({
                studentId: financeTransactions.studentId,
                totalCredits: sql<number>`SUM(CASE WHEN ${financeTransactions.transactionType} = 'credit' THEN ${financeTransactions.amount} ELSE 0 END)`,
                totalDebits: sql<number>`SUM(CASE WHEN ${financeTransactions.transactionType} = 'debit' THEN ${financeTransactions.amount} ELSE 0 END)`,
            }).from(financeTransactions).where(and(
                eq(financeTransactions.schoolId, schoolId),
                eq(financeTransactions.term, currentTerm),
                eq(financeTransactions.year, currentYear)
            )).groupBy(financeTransactions.studentId);

            let highDebtorsCount = 0;
            const HIGH_DEBT_THRESHOLD = 500000;

            studentBalances.forEach(record => {
                const balance = Number(record.totalDebits || 0) - Number(record.totalCredits || 0);
                if (balance >= HIGH_DEBT_THRESHOLD) highDebtorsCount++;
            });

            if (highDebtorsCount > 0) {
                alerts.push({
                    severity: 'warning',
                    type: 'high_debtors',
                    message: `${highDebtorsCount} students owe ${HIGH_DEBT_THRESHOLD >= 1000 ? HIGH_DEBT_THRESHOLD / 1000 + 'K' : HIGH_DEBT_THRESHOLD.toString()} or more in fees`,
                    action: '/app/finance'
                });
            }
        }

        const upcomingBdays = await this.getUpcomingEvents(schoolId);
        const justBdays = upcomingBdays.filter(e => e.type === 'birthday');
        if (justBdays.length > 0) {
            alerts.push({
                severity: 'info',
                type: 'birthdays',
                message: `${justBdays.length} student birthdays this week`,
                detail: justBdays.map(b => b.title.replace("'s Birthday", "")).join(', '),
                action: '/app/students'
            });
        }

        return alerts;
    }
}

export const dashboardService = new DashboardService();
