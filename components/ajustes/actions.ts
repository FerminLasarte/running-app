/* Lo que cambia la configuración desde Ajustes. Todo se guarda en el acto y avisa con un toast, como en la pantalla
   vieja; lo que está mal escrito queda como estaba y el aviso dice qué revisar. */
import { S } from '@/lib/store';
import { afterPaint } from '@/lib/nav';
import { blockDemo, buzz, focusField, ajId, ajNameId, saveCfg, setAjEdit, toast } from '@/lib/data/actions';
import type { Cfg } from '@/lib/domain/types';
import { activeShoes, normCfg, normShoe } from '@/lib/domain/config';
import { cleanObj } from '@/lib/domain/util';
import { zonesOf } from '@/lib/domain/settings';

/** cambia una copia de la configuración y la guarda; `fn` devuelve lo que hay que revisar */
export function commitCfg(fn: (c: Cfg) => string[] | void, ok = 'Ajustes guardados') {
  if (blockDemo()) return;
  const before = JSON.stringify(S.cfg),
    c = cleanObj(S.cfg),
    bad = fn(c) || [];
  const n = normCfg(c),
    same = JSON.stringify(n) === before;
  if (!same) saveCfg(n);
  if (bad.length) toast((same ? 'No lo guardé: revisá ' : 'Guardé el resto. Revisá ') + bad.join(', ') + '.', 5000);
  else if (!same) toast(ok);
}

/** cambia la configuración sin avisar (lo que se ve cambiar en el momento: principal, retirar, la foto) */
function quiet(fn: (c: Cfg) => void) {
  if (blockDemo()) return false;
  const c = cleanObj(S.cfg);
  fn(c);
  saveCfg(normCfg(c));
  return true;
}

/* ---- carreras y zapatillas abiertas para editar: al cerrarse, el foco vuelve a su botón ---- */
export const editBtnId = (kind: 'r' | 'z', id: string) => ajId(kind, id) + '-ed';
export const addBtnId = (kind: 'r' | 'z') => 'aj-' + kind + '-add';
const focusLater = (id: string) => afterPaint(() => document.getElementById(id)?.focus());
export function closeEdit(kind: 'r' | 'z', id: string) {
  setAjEdit(null);
  focusLater(editBtnId(kind, id));
}

export const setGoal = (v: number) => commitCfg((c) => void (c.weeklyGoal = Math.max(1, Math.min(7, Math.round(v)))));

/* ---- zonas ---- */
export const saveZones = (edges: number[]) => commitCfg((c) => void (c.zones = zonesOf(edges)), 'Zonas guardadas');
/** vuelve a las zonas por % de la FC máxima */
export const resetZones = () => commitCfg((c) => void (c.zones = null), 'Zonas por % de tu FC máxima');

/* ---- carreras ---- */
export function raceDel(id: string) {
  if (
    quiet((c) => {
      c.races = c.races.filter((r) => r.id !== id);
      if (c.rcs) delete c.rcs[id];
    })
  ) {
    setAjEdit(null);
    focusLater(addBtnId('r'));
    toast('Carrera borrada');
  }
}

/* ---- zapatillas ---- */
export function shoeAdd() {
  const z = normShoe({ name: 'Zapatillas nuevas', main: !activeShoes().length });
  if (!quiet((c) => void (c.shoes = (c.shoes || []).concat([z])))) return;
  setAjEdit('z:' + z.id);
  focusField(ajNameId('z', z.id));
}
export const shoeMain = (id: string) => quiet((c) => c.shoes.forEach((z) => (z.main = z.id === id)));
export const shoeRet = (id: string) =>
  quiet((c) => {
    const z = c.shoes.find((x) => x.id === id);
    if (!z) return;
    z.retired = !z.retired;
    if (z.retired) z.main = false;
  });

/* ---- foto ---- */
export function avatarDel() {
  if (quiet((c) => void delete c.avatar)) toast('Sacamos tu foto');
}
export function setAvatar(file: File) {
  if (blockDemo()) return;
  if (!/^image\//.test(file.type || '')) {
    toast('Elegí una imagen (JPG, PNG o HEIC)');
    return;
  }
  const url = URL.createObjectURL(file),
    im = new Image();
  im.onload = () => {
    /* recorte cuadrado al centro, 256 px: pesa poco y se ve nítida en cualquier pantalla */
    const n = 256,
      cv = document.createElement('canvas');
    cv.width = cv.height = n;
    const x = cv.getContext('2d')!;
    const sd = Math.min(im.naturalWidth, im.naturalHeight),
      sx = (im.naturalWidth - sd) / 2,
      sy = (im.naturalHeight - sd) / 2;
    x.imageSmoothingQuality = 'high';
    x.drawImage(im, sx, sy, sd, sd, 0, 0, n, n);
    URL.revokeObjectURL(url);
    quiet((c) => void (c.avatar = cv.toDataURL('image/jpeg', 0.86)));
    buzz(8);
    toast('Listo, ya está tu foto');
  };
  im.onerror = () => {
    URL.revokeObjectURL(url);
    toast('No pude abrir esa imagen. Probá con otra (JPG o PNG).');
  };
  im.src = url;
}
