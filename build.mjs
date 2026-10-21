import * as esbuild from 'esbuild';
import { cpSync, rmSync, mkdirSync } from 'node:fs';

const serve = process.argv.includes('--serve');
rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const p of ['index.html', 'css', 'fonts']) cpSync(`src/${p}`, `www/${p}`, { recursive: true });

const options = {
  entryPoints: { app: 'src/js/main.js', 'catnap-worker': 'src/js/games/catnap/worker.js' },
  bundle: true,
  format: 'esm',
  target: 'safari15',
  outdir: 'www',
  minify: !serve,
  sourcemap: serve,
};

if (serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: 'www', host: '0.0.0.0', port: 8000 });
  console.log(`Marscade running at http://localhost:${port} (open your PC's IP on the same Wi-Fi to test on iPhone)`);
} else {
  await esbuild.build(options);
  console.log('Built to www/');
}
