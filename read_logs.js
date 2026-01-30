
const fs = require('fs');
try {
    const content = fs.readFileSync('logs.json', 'utf16le');
    const logs = JSON.parse(content);
    logs.forEach(log => {
        if (log.textPayload) {
            console.log("--- LOG START ---");
            console.log(log.textPayload);
            console.log("--- LOG END ---");
        } else if (log.jsonPayload) {
            console.log("--- JSON LOG START ---");
            console.log(JSON.stringify(log.jsonPayload, null, 2));
            console.log("--- JSON LOG END ---");
        }
    });
} catch (e) {
    console.error(e);
}
