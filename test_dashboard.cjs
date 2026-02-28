require('dotenv').config();
const { db } = require('./server/db');

async function test() {
    try {
        console.log("Testing dashboard stats...");
        const { dashboardService } = require('./server/services/DashboardService');

        console.log("1. Division Distribution:");
        const div = await dashboardService.getDivisionDistribution(1);
        console.log(div);

        console.log("2. Academic Performance:");
        const acad = await dashboardService.getAcademicPerformance(1);
        console.log(acad);

        console.log("3. Class Performance:");
        const cls = await dashboardService.getClassPerformance(1);
        console.log(cls);

    } catch (err) {
        console.error("CRASH:", err);
    } finally {
        process.exit();
    }
}

test();
