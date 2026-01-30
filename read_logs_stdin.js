
const fs = require('fs');
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
    try {
        const logs = JSON.parse(data);
        logs.forEach(log => {
            if (log.textPayload) {
                console.log("--- LOG ---");
                console.log(log.textPayload.replace(/\\n/g, '\n'));
            } else if (log.jsonPayload) {
                console.log("--- JSON LOG ---");
                console.log(JSON.stringify(log.jsonPayload, null, 2));
            }
        });
    } catch (e) {
        console.error("Parse Error:", e.message);
        console.error("Data Start:", data.slice(0, 50));
    }
});
