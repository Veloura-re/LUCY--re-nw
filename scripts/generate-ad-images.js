const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const ads = [
    { id: 'ad-1', filename: 'ad-pilot-node.png' },
    { id: 'ad-2', filename: 'ad-cognitive-synthesis.png' },
    { id: 'ad-3', filename: 'ad-realtime-telemetry.png' },
    { id: 'ad-4', filename: 'ad-absolute-governance.png' },
    { id: 'ad-5', filename: 'ad-precision-financials.png' },
    { id: 'ad-6', filename: 'ad-connected-campuses.png' },
];

const outputDir = path.join(__dirname, '../public/marketing-assets/ads');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const templatePath = path.join(__dirname, '../public/marketing-assets/generator.html');
const htmlContent = fs.readFileSync(templatePath, 'utf8');

const promises = ads.map(ad => {
    return new Promise((resolve, reject) => {
        const singlePageContent = htmlContent.replace(
            '<div class="grid-container" id="ad-container">',
            `<style>
                body { padding: 0 !important; margin: 0 !important; overflow: hidden !important; background: #08090d !important; width: 1200px !important; height: 1200px !important; }
                .grid-container { padding: 0 !important; gap: 0 !important; }
                .marketing-card { display: none !important; }
                #${ad.id} { display: flex !important; width: 1200px !important; height: 1200px !important; }
            </style>
            <div class="grid-container" id="ad-container">`
        );

        const tempHtmlPath = path.join(__dirname, `../public/marketing-assets/temp_${ad.id}.html`);
        fs.writeFileSync(tempHtmlPath, singlePageContent);

        const outputPath = path.join(outputDir, ad.filename);
        const cmd = `chromium-browser --headless=new --no-sandbox --disable-gpu --window-size=1200,1200 --screenshot="${outputPath}" "file://${tempHtmlPath}"`;

        console.log(`Starting ${ad.filename}...`);
        exec(cmd, (error, stdout, stderr) => {
            if (fs.existsSync(tempHtmlPath)) {
                fs.unlinkSync(tempHtmlPath);
            }
            if (error) {
                console.error(`Error generating ${ad.filename}:`, error);
                reject(error);
            } else {
                console.log(`Finished ${ad.filename}`);
                resolve(outputPath);
            }
        });
    });
});

Promise.all(promises)
    .then(() => {
        console.log('All 6 picture ads generated successfully!');
        process.exit(0);
    })
    .catch(err => {
        console.error('One or more ad generations failed:', err);
        process.exit(1);
    });
