/* Convierte el mapa de fondo del artifact original (reference/mapa-ba2.js, que hace `window.__BA = {b, o}`) en
   public/map/ba.json, que la pestaña Mapa baja recién cuando se abre. Se corre a mano una sola vez:
   node scripts/build-map-data.mjs */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(resolve(root, 'reference/mapa-ba2.js'), 'utf8');

/* lo evalúo en un contexto aislado con un `window` falso: no hace falta parsear el archivo a mano */
const ctx = { window: {} };
vm.runInNewContext(src, ctx, { timeout: 5000 });
const ba = ctx.window.__BA;
if (!ba || !Array.isArray(ba.b) || !ba.o) throw new Error('mapa-ba2.js no definió window.__BA = {b, o}');

const out = resolve(root, 'public/map/ba.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ b: ba.b, o: ba.o }));
console.log('public/map/ba.json: ' + ba.b.length + ' barrios, capas ' + Object.keys(ba.o).join(' '));
