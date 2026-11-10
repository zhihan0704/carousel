import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const standalone = process.argv.includes('--standalone');
const minify = process.argv.includes('--minify') || standalone;

await build({
  entryPoints: [path.join(dir, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: ['chrome100', 'safari16'],
  platform: 'browser',
  minify,
  sourcemap: standalone ? false : 'inline',
  legalComments: 'none',
  outfile: path.join(dir, 'bundle.js'),
  logLevel: 'info'
});

if (standalone) {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(dir, 'bundle.js'), 'utf8');
  const musicScript = fs.readFileSync(path.join(dir, 'music-ui.js'), 'utf8');
  const audioPath = path.join(dir, 'assets', 'music.mp3');
  if (!fs.existsSync(audioPath)) throw new Error('music asset not found: assets/music.mp3');
  const audioBase64 = fs.readFileSync(audioPath).toString('base64');

  const bundleMarker = '<script src="./bundle.js"></script>';
  const musicScriptMarker = '<script src="./music-ui.js"></script>';
  const audioMarker = 'src="./assets/music.mp3"';
  if (!html.includes(bundleMarker)) throw new Error('bundle marker not found in index.html');
  if (!html.includes(musicScriptMarker)) throw new Error('music script marker not found in index.html');
  if (!html.includes(audioMarker)) throw new Error('music source marker not found in index.html');

  // A literal </script> inside an inline script would terminate it early.
  const safeBundle = script.replace(/<\/script/gi, '<\\/script');
  const safeMusic = musicScript.replace(/<\/script/gi, '<\\/script');
  // Replacer functions keep `$&`, `$'` etc. in minified JS from being interpreted.
  let inlined = html
    .replace(audioMarker, () => 'src="data:audio/mpeg;base64,' + audioBase64 + '"')
    .replace(musicScriptMarker, () => '<script>\n' + safeMusic + '\n</script>')
    .replace(bundleMarker, () => '<script>\n' + safeBundle + '\n</script>');

  const outPath = path.join(dir, '..', '霓虹旋转木马-梦幻夜曲.html');
  fs.writeFileSync(outPath, inlined);
  console.log('standalone written:', outPath);
  console.log('  HTML:', (inlined.length / 1024 / 1024).toFixed(2) + ' MB; embedded MP3:', (fs.statSync(audioPath).size / 1024 / 1024).toFixed(2) + ' MB');
}
