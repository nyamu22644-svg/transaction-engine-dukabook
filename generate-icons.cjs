const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceImage = 'C:\\Users\\ThinkPad\\Downloads\\cropped_logo.png';
const androidResDir = './android/app/src/main/res';

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

async function generateIcons() {
  console.log('Generating Android icons from:', sourceImage);
  
  for (const [folder, size] of Object.entries(sizes)) {
    const outputDir = path.join(androidResDir, folder);
    
    // ic_launcher.png - standard icon
    await sharp(sourceImage)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, 'ic_launcher.png'));
    
    // ic_launcher_round.png - round icon
    await sharp(sourceImage)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_round.png'));
    
    // ic_launcher_foreground.png - adaptive icon foreground (needs padding)
    const foregroundSize = Math.round(size * 1.5);
    await sharp(sourceImage)
      .resize(Math.round(size * 0.7), Math.round(size * 0.7))
      .extend({
        top: Math.round(foregroundSize * 0.22),
        bottom: Math.round(foregroundSize * 0.22),
        left: Math.round(foregroundSize * 0.22),
        right: Math.round(foregroundSize * 0.22),
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .resize(foregroundSize, foregroundSize)
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_foreground.png'));
    
    console.log(`✓ Generated ${folder} icons (${size}px)`);
  }
  
  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(console.error);
