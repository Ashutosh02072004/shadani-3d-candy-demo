// Bundles src/ into one self-contained index.html (no server or internet needed).
import { build, context } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const write = (result) => {
  const out = Object.fromEntries(result.outputFiles.map((f) => [f.path.split('.').pop(), f.text]));
  const js = out.js.replace(/<\/script/gi, '<\\/script');
  const html = readFileSync('src/index.template.html', 'utf8')
    .replace('<!--CSS-->', () => `<style>${out.css}</style>`)
    .replace('<!--JS-->', () => `<script>${js}</script>`);
  writeFileSync('index.html', html);
  console.log(`index.html  ${(html.length / 1024 / 1024).toFixed(2)} MB`);
};

const options = {
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  outdir: 'dist',
  write: false,
  loader: { '.svg': 'dataurl', '.woff2': 'dataurl', '.woff': 'empty' },
};

if (process.argv.includes('--watch')) {
  const ctx = await context({
    ...options,
    plugins: [{ name: 'html', setup: (b) => b.onEnd((r) => r.errors.length || write(r)) }],
  });
  await ctx.watch();
  console.log('Watching src/ ...');
} else {
  write(await build(options));
}
