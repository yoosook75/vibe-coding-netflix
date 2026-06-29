const fs = require('fs');
const path = require('path');

const apiKey = process.env.TMDB_API_KEY || '';

if (!apiKey) {
  console.warn('Warning: TMDB_API_KEY environment variable is not set.');
}

const content = `window.APP_CONFIG = {\n  TMDB_API_KEY: ${JSON.stringify(apiKey)},\n};\n`;
const outPath = path.join(__dirname, '..', 'js', 'config.js');

fs.writeFileSync(outPath, content, 'utf8');
console.log('Generated js/config.js for deployment.');
