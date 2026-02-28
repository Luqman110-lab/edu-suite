import 'dotenv/config';
import { dashboardService } from './server/services/DashboardService.js';

async function test() {
    try {
        console.log("Testing dashboard stats...");
        const schoolId = 1;

        console.log("\n--- 1. Division Distribution ---");
        const div = await dashboardService.getDivisionDistribution(schoolId);
        console.dir(div, { depth: null });

        console.log("\n--- 2. Academic Performance ---");
        const acad = await dashboardService.getAcademicPerformance(schoolId);
        console.dir(acad, { depth: null });

        console.log("\n--- 3. Class Performance ---");
        const cls = await dashboardService.getClassPerformance(schoolId);
        console.dir(cls, { depth: null });

    } catch (err) {
        console.error("CRASH:", err);
    } finally {
        process.exit();
    }
}

test();
