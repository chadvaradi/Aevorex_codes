// simple repo scan script to log references to deprecated files
// Usage: node scripts/scan.js [pattern] [--json] [--out outputFile]

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function main() {
  const args = process.argv.slice(2);
  const pattern = args[0] || 'DataService';
  const outFileIndex = args.findIndex(a => a === '--out');
  const outFile = outFileIndex !== -1 ? args[outFileIndex + 1] : `logs/SCAN_${new Date().toISOString().substring(0,10)}.json`;

  try {
    const rgCmd = `rg -n --json "${pattern}" --glob "*.js" --glob "!node_modules/**"`;
    const output = execSync(rgCmd, { encoding: 'utf-8' });
    const lines = output.trim().split(/\r?\n/).filter(Boolean);
    const results = lines.map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean).filter(obj => obj.type === 'match');

    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify({ pattern, matches: results }, null, 2));
    console.log(`Scan complete. ${results.length} matches written to ${outFile}`);
  } catch (err) {
    console.error('Scan error:', err.message);
  }
}

if (require.main === module) {
  main();
} 