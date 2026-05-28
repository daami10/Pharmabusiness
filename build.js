const fs = require('fs');

const supabaseUrl  = process.env.SUPABASE_URL      || '';
const supabaseKey  = process.env.SUPABASE_ANON_KEY  || '';
const gemini       = process.env.GEMINI_KEY         || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Faltan variables de entorno (SUPABASE_URL, SUPABASE_ANON_KEY)');
  process.exit(1);
}

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/__SUPABASE_URL__/g,      supabaseUrl);
html = html.replace(/__SUPABASE_ANON_KEY__/g, supabaseKey);
html = html.replace(/__GEMINI_KEY__/g,        gemini);

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);
console.log('Build completado correctamente.');
