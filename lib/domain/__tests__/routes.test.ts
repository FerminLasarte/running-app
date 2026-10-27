import { describe, expect, it } from 'vitest';
import { isAppPath } from '@/lib/routes';

describe('qué pide entrar', () => {
  it('las páginas de la app y lo que cuelga de ellas', () => {
    expect(['/semana', '/logros', '/logros/vitrina', '/sesion/abc', '/ajustes'].every(isAppPath)).toBe(true);
  });
  it('lo demás llega al 404 (o es público)', () => {
    expect(['/', '/login', '/semna', '/logrosx', '/algo/semana'].some(isAppPath)).toBe(false);
  });
});
