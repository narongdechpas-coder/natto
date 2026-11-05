// Generates the QR code used on the booth deck (points to the live demo on GitHub Pages).
import QRCode from 'qrcode';
import fs from 'node:fs';
const URL = 'https://narongdechpas-coder.github.io/natto/';
const svg = await QRCode.toString(URL, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#15357D', light: '#FFFFFF' } });
fs.writeFileSync('public/deck/qr-demo.svg', svg);
console.log('QR →', URL);
