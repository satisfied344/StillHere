/* In-place image optimization v2.
   Reads file into buffer first to avoid Windows file-locking issues.
   Run: node scripts/optimize-images.js */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const RULES = [
  { match: /paper-textures/i,        maxW: 1400, jpgQ: 70 },
  { match: /paper-structions/i,      maxW: 800,  pngQ: 80 },
  { match: /Asterisk|Quotation/i,    maxW: 500,  pngQ: 78 },
  { match: /letters|skotch/i,        maxW: 800,  pngQ: 80 },
  { match: /crayon-textures/i,       maxW: 1200, pngQ: 80 },
  { match: /doodles|emotions|cats/i, maxW: 500,  pngQ: 82 },
  { match: /fog/i,                   maxW: 1400, jpgQ: 70 },
];
const DEFAULT = { maxW: 900, jpgQ: 76, pngQ: 82 };

function ruleFor(p) {
  for (const r of RULES) if (r.match.test(p)) return { ...DEFAULT, ...r };
  return DEFAULT;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(png|jpe?g)$/i.test(e.name)) out.push(p);
  }
  return out;
}

(async () => {
  const files = walk('assets');
  let totalBefore = 0, totalAfter = 0, processed = 0;

  for (const file of files) {
    const before = fs.statSync(file).size;
    totalBefore += before;
    const rule = ruleFor(file);
    const isJpg = /\.jpe?g$/i.test(file);

    try {
      // Read into buffer first — sidesteps Windows file-lock UNKNOWN errors.
      const input = fs.readFileSync(file);
      const meta = await sharp(input).metadata();
      const resize = meta.width > rule.maxW
        ? { width: rule.maxW, withoutEnlargement: true }
        : null;

      let pipeline = sharp(input, { failOn: 'none' });
      if (resize) pipeline = pipeline.resize(resize);

      const buf = isJpg
        ? await pipeline.jpeg({ quality: rule.jpgQ, mozjpeg: true, progressive: true }).toBuffer()
        : await pipeline.png({ quality: rule.pngQ, compressionLevel: 9, palette: true, effort: 10 }).toBuffer();

      if (buf.length < before) {
        fs.writeFileSync(file, buf);
        totalAfter += buf.length;
        processed++;
        const reduction = (100 * (1 - buf.length / before)).toFixed(0);
        console.log(`  ${(before/1024).toFixed(0).padStart(5)}KB → ${(buf.length/1024).toFixed(0).padStart(5)}KB  -${reduction}%  ${file}`);
      } else {
        totalAfter += before;
        console.log(`  skip (no gain): ${file}`);
      }
    } catch (e) {
      totalAfter += before;
      console.log(`  ERROR ${file}: ${e.message}`);
    }
  }

  console.log('\n=== DONE ===');
  console.log(`Files processed: ${processed}/${files.length}`);
  console.log(`Before: ${(totalBefore/1024/1024).toFixed(2)} MB`);
  console.log(`After:  ${(totalAfter/1024/1024).toFixed(2)} MB`);
  console.log(`Saved:  ${((totalBefore-totalAfter)/1024/1024).toFixed(2)} MB (${(100*(1-totalAfter/totalBefore)).toFixed(1)}%)`);
})();
