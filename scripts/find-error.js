const fs = require('fs');
const text = fs.readFileSync('logs.json', 'utf-8');
const lines = text.split('\n');
lines.forEach(line => {
    if (line.includes('"error"')) {
        try {
            const data = JSON.parse(line);
            if (data.level === 'error') {
                console.log(JSON.stringify(data, null, 2));
                console.log('---');
            }
        } catch (e) {}
    }
});
