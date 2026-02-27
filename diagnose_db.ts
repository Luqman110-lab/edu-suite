import { Pool } from 'pg';

const dbUrl = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    try {
        console.log("--------------- Active Queries ---------------");
        const res = await pool.query(`
            SELECT pid, state, query, wait_event_type, wait_event 
            FROM pg_stat_activity 
            WHERE state != 'idle' AND query NOT ILIKE '%pg_stat_activity%';
        `);
        console.log("Count:", res.rows.length);
        console.log(res.rows);

        console.log("--------------- Blocking Locks ---------------");
        const res2 = await pool.query(`
            SELECT blocked_locks.pid AS blocked_pid,
                   blocked_activity.usename AS blocked_user,
                   blocking_locks.pid AS blocking_pid,
                   blocking_activity.usename AS blocking_user,
                   blocked_activity.query AS blocked_query,
                   blocking_activity.query AS blocking_query
            FROM pg_catalog.pg_locks blocked_locks
            JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
            JOIN pg_catalog.pg_locks blocking_locks 
                ON blocking_locks.locktype = blocked_locks.locktype
                AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
                AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
                AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
                AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
                AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
                AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
                AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
                AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
                AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
                AND blocking_locks.pid != blocked_locks.pid
            JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
            WHERE NOT blocked_locks.granted;
        `);
        console.log("Count:", res2.rows.length);
        console.log(res2.rows);

        console.log("--------------- Attempting to kill blocking process ---------------");

        // Let's try to terminate any blocking pids
        const blockingPids = new Set(res2.rows.map(r => r.blocking_pid));
        for (const pid of blockingPids) {
            console.log("Terminating pid", pid);
            await pool.query(`SELECT pg_terminate_backend(${pid});`);
        }

    } catch (e) {
        console.error("Query Failed:", e.message);
    } finally {
        await pool.end();
    }
}
main();
