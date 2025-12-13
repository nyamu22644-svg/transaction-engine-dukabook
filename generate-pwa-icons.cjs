const sharp = require('sharp');
const path = require('path');

const sourceImage = 'C:\\Users\\ThinkPad\\Downloads\\cropped_logo.png';
const outputDir = './public/icons';

async function generatePWAIcons() {
  console.log('Generating PWA icons...');
  
  // 192x192 icon
  await sharp(sourceImage)
    .resize(192, 192)
    .png()
    .toFile(path.join(outputDir, 'icon-192.png'));
  console.log('✓ icon-192.png');
  
  // 512x512 icon
  await sharp(sourceImage)
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDir, 'icon-512.png'));
  console.log('✓ icon-512.png');
  
  // Apple touch icon (180x180)
  await sharp(sourceImage)
    .resize(180, 180)
    .png()
    .toFile('./public/apple-touch-icon.png');
  console.log('✓ apple-touch-icon.png');
  
  // Favicon (32x32)
  await sharp(sourceImage)
    .resize(32, 32)
    .png()
    .toFile('./public/favicon.ico');
  console.log('✓ favicon.ico');
  
  console.log('\n✅ All PWA icons generated!');
}

generatePWAIcons().catch(console.error);
