const fs = require('fs');
const path = require('path');
const sharp = require('sharp'); // Sharp is almost definitely installed in an Expo project

async function generate() {
    const src = './assets/web-icon-link.png';
    console.log("Generating icons using sharp...");

    const resolutions = {
        'mdpi': 48,
        'hdpi': 72,
        'xhdpi': 96,
        'xxhdpi': 144,
        'xxxhdpi': 192
    };

    for (const [res, size] of Object.entries(resolutions)) {
        const destDir = `./android/app/src/main/res/mipmap-${res}`;
        
        // Remove existing webp
        ['ic_launcher.webp', 'ic_launcher_round.webp', 'ic_launcher_foreground.webp'].forEach(f => {
            const file = path.join(destDir, f);
            if (fs.existsSync(file)) fs.unlinkSync(file);
        });

        // Create new PNGs
        await sharp(src).resize(size, size).png().toFile(path.join(destDir, 'ic_launcher.png'));
        await sharp(src).resize(size, size).png().toFile(path.join(destDir, 'ic_launcher_round.png'));
        await sharp(src).resize(size, size).png().toFile(path.join(destDir, 'ic_launcher_foreground.png'));
        
        console.log(`Generated ${res} (${size}x${size})`);
    }
}

generate().catch(e => console.error(e));
