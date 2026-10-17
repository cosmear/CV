// Dependency-free delivery build. Source CSS/JS remains editable in css/ and js/.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, basename, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'assets/asset-manifest.json');
const previousManifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath)) : {};
// Image intermediates are regenerated only when a PNG master changes. A fresh
// checkout can rebuild CSS/JS using the already-versioned delivery images.
const read = file => readFileSync(resolve(root, existsSync(resolve(root, file)) ? file : (previousManifest[file] || file)));
const readText = file => read(file).toString().replace(/\r\n/g, '\n');
let html = readText('index.html');
// Restore logical URLs first, so subsequent builds also pick up edited masters.
if (Object.keys(previousManifest).length) {
  for (const [source, output] of Object.entries(previousManifest)) {
    html = html.split(output).join(source);
  }
}
mkdirSync(resolve(root, 'assets/static'), { recursive: true });
const manifest = {};
function emit(source, data = /\.(js|svg)$/.test(source) ? Buffer.from(readText(source)) : read(source)) {
  if (manifest[source]) return manifest[source];
  const extension = extname(source);
  const hash = createHash('sha256').update(data).digest('hex').slice(0, 12);
  const output = `assets/static/${basename(source, extension)}.${hash}${extension}`;
  writeFileSync(resolve(root, output), data);
  manifest[source] = output;
  return output;
}
let css = ['css/fonts.css', 'css/main.css', 'css/responsive.css'].map(readText).join('\n');
css = css.replace(/url\("\.\.\/(assets\/fonts\/[^"\n]+)"\)/g, (_, source) => `url("./${basename(emit(source))}")`);
const stylesheet = emit('css/site.css', Buffer.from(css));
html = html.replace(/<!-- delivery:styles:start -->[\s\S]*?<!-- delivery:styles:end -->/, `<!-- delivery:styles:start -->
    <link rel="preconnect" href="https://cdn.fontshare.com" crossorigin />
    <link rel="preload" href="https://cdn.fontshare.com/wf/ZX6AQLSFYVDPN2URWO2MQFGTYYOHIS64/TPYPKOYWFQVNJHLLRXD4KFYX4LUOUW4Z/6QH2ALVTTK7IRVO5MYOQQ3OZNXW5SSS3.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="${stylesheet}" />
    <!-- delivery:styles:end -->`);
// Only delivery resources are fingerprinted. Canonical, JSON-LD, social images,
// navigation and PNG masters keep their original URLs.
html = html.replace(/\b(src|href|srcset)="([^"]+)"/g, (attribute, name, value) => {
  const rewrite = url => {
    if (url === 'js/main.js' || /^assets\/.+\.(avif|webp|svg)$/.test(url)) return emit(url);
    return url;
  };
  const updated = name === 'srcset'
    ? value.split(',').map(item => item.trim().replace(/^\S+/, rewrite)).join(', ')
    : rewrite(value);
  return `${name}="${updated}"`;
});
// Inlining this small dictionary (~4.8 KiB gzip) avoids both a parser-blocking
// request and a late ES->EN repaint. It runs after the complete body is parsed.
const translations = `<!-- delivery:translations:start -->\n    <script>${readText('js/translations.js').replace(/<\/script/gi, '<\\/script')}</script>\n    <!-- delivery:translations:end -->`;
if (html.includes('<!-- delivery:translations:start -->')) {
  html = html.replace(/<!-- delivery:translations:start -->[\s\S]*?<!-- delivery:translations:end -->/, () => translations);
} else html = html.replace('</body>', `${translations}\n  </body>`);
writeFileSync(resolve(root, 'index.html'), html);
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Built ${Object.keys(manifest).length} versioned resources. Keep old hashes through the HTML cache window.`);
