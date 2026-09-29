const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const htmlPath = 'C:\\Users\\Aljon\\Desktop\\Design.html';
const content = fs.readFileSync(htmlPath, 'utf8');

const manifestMatch = content.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
const templateMatch = content.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
const pageOrderMatch = content.match(/<script type="__bundler\/page_order">([\s\S]*?)<\/script>/);

const outDir = path.join(__dirname, 'unpacked_design');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

if (pageOrderMatch) {
  fs.writeFileSync(path.join(outDir, 'page_order.json'), pageOrderMatch[1]);
  console.log('Saved page_order.json');
}

if (templateMatch) {
  let template = JSON.parse(templateMatch[1]);
  fs.writeFileSync(path.join(outDir, 'template.html'), template);
  console.log('Saved template.html');
}

if (manifestMatch) {
  const manifest = JSON.parse(manifestMatch[1]);
  console.log('Manifest entries:', Object.keys(manifest).length);
  for (const [uuid, entry] of Object.entries(manifest)) {
    let buf = Buffer.from(entry.data, 'base64');
    if (entry.compressed) {
      try {
        buf = zlib.gunzipSync(buf);
      } catch (e) {
        console.error('Error gunzipping', uuid, e);
      }
    }
    let ext = 'bin';
    if (entry.mime.includes('html')) ext = 'html';
    else if (entry.mime.includes('javascript') || entry.mime.includes('jsx')) ext = 'js';
    else if (entry.mime.includes('css')) ext = 'css';
    else if (entry.mime.includes('json')) ext = 'json';
    else if (entry.mime.includes('svg')) ext = 'svg';
    else if (entry.mime.includes('png')) ext = 'png';
    else if (entry.mime.includes('font') || entry.mime.includes('woff')) ext = 'woff2';

    fs.writeFileSync(path.join(outDir, `${uuid}.${ext}`), buf);
  }
  console.log('Saved all manifest assets to', outDir);
}
