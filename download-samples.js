const fs = require('fs');
const path = require('path');
const https = require('https');

const samplesDir = path.join(__dirname, 'samples');
if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir);
}

const baseUrl = 'https://oramics.github.io/sampled/DRUMS/pearl-master-studio/samples/';

// All 15 Pearl Master Studio samples + mapping to local filenames
const samples = {
    'kick.wav': 'kick-01.wav',
    'snare.wav': 'snare-01.wav',
    'snare2.wav': 'snare-02.wav',
    'snare3.wav': 'snare-03.wav',
    'hat_closed.wav': 'hihat-closed.wav',
    'hat_open.wav': 'hihat-open.wav',
    'tom_low.wav': 'tom-01.wav',
    'tom_mid.wav': 'tom-02.wav',
    'tom_high.wav': 'tom-03.wav',
    'crash.wav': 'crash-01.wav',
    'crash2.wav': 'crash-02.wav',
    'ride.wav': 'ride-01.wav',
    'ride2.wav': 'ride-02.wav',
    'splash.wav': 'splash-01.wav',
    'splash2.wav': 'splash-02.wav'
};

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                file.close();
                fs.unlinkSync(dest);
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(dest);
                reject(new Error(`HTTP ${response.statusCode} for ${url}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                const stats = fs.statSync(dest);
                console.log(`  ${path.basename(dest).padEnd(20)} ${stats.size} bytes`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function main() {
    console.log('Downloading full Pearl Master Studio drum kit...\n');

    for (const [localName, remoteName] of Object.entries(samples)) {
        const url = baseUrl + remoteName;
        const dest = path.join(samplesDir, localName);
        try {
            await downloadFile(url, dest);
        } catch (err) {
            console.error(`  FAILED: ${localName} - ${err.message}`);
        }
    }
    console.log('\nDone! All samples downloaded.');
}

main();
