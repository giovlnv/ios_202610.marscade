import * as esbuild from 'esbuild';
import { cpSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const serve = process.argv.includes('--serve');
const build = process.env.MARSCADE_BUILD || execSync('git log -1 --format=%ct').toString().trim();
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
  define: { BUILD: build, VERSION: JSON.stringify(JSON.parse(readFileSync('package.json', 'utf8')).version) },
};

if (serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: 'www', host: '0.0.0.0', port: 8000 });
  console.log(`Marscade running at http://localhost:${port} (open your PC's IP on the same Wi-Fi to test on iPhone)`);
} else {
  await esbuild.build(options);
  console.log(`Built to www/ (build ${build})`);
}
