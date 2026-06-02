const fs   = require('fs');
const path = require('path');

const supabaseUrl  = process.env.SUPABASE_URL      || '';
const supabaseKey  = process.env.SUPABASE_ANON_KEY  || '';
const gemini       = process.env.GEMINI_KEY         || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Faltan variables de entorno (SUPABASE_URL, SUPABASE_ANON_KEY)');
  process.exit(1);
}

const src  = path.join(__dirname, 'index.html');
const dest = path.join(__dirname, 'dist', 'index.html');

let html = fs.readFileSync(src, 'utf8');
html = html.replace(/__SUPABASE_URL__/g,      supabaseUrl);
html = html.replace(/__SUPABASE_ANON_KEY__/g, supabaseKey);
html = html.replace(/__GEMINI_KEY__/g,        gemini);

fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(dest, html);
console.log(`Build OK — ${html.length} chars desde ${src}`);
