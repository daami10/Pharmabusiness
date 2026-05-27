const fs = require('fs');

const token   = process.env.AIRTABLE_TOKEN  || '';
const base    = process.env.AIRTABLE_BASE   || '';
const gemini  = process.env.GEMINI_KEY      || '';

if (!token || !base || !gemini) {
  console.error('ERROR: Faltan variables de entorno (AIRTABLE_TOKEN, AIRTABLE_BASE, GEMINI_KEY)');
  process.exit(1);
}

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/__AIRTABLE_TOKEN__/g, token);
html = html.replace(/__AIRTABLE_BASE__/g,  base);
html = html.replace(/__GEMINI_KEY__/g,     gemini);

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);
console.log('Build completado correctamente.');
