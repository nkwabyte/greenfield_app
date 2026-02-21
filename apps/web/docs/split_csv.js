const fs = require('fs');
const readline = require('readline');
const path = require('path');

const inputFile = path.join(__dirname, 'farmers_import.csv');
const outDir = path.join(__dirname, 'farmers');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

async function splitCSV() {
    const fileStream = fs.createReadStream(inputFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let header = null;
    let currentPart = 1;
    let count = 0;
    const maxRows = 1000;
    let writeStream = null;

    for await (const line of rl) {
        if (!header) {
            header = line;
            continue;
        }

        if (count === 0) {
            if (writeStream) {
                writeStream.end();
            }
            const outPath = path.join(outDir, `farmers_part_${currentPart}.csv`);
            writeStream = fs.createWriteStream(outPath);
            writeStream.write(header + '\n');
        }

        writeStream.write(line + '\n');
        count++;

        if (count === maxRows) {
            count = 0;
            currentPart++;
        }
    }

    if (writeStream) {
        writeStream.end();
    }

    console.log(`Successfully split into ${currentPart} files in the 'farmers/' directory.`);
}

splitCSV().catch(console.error);
