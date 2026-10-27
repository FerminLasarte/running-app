import { afterEach, describe, expect, it, vi } from 'vitest';
import { addDays, dayDiff, fmt, fmtDur, fmtPace, isoWeek, kmByMonth, mondayOf, num, pd, ymd } from '../util';
import { hmsFromSec, msFromSec, readHms, readMs } from '../hms';
import { today } from './fixtures';

afterEach(() => vi.useRealTimers());

describe('formatos', () => {
  it('fmt: coma decimal y sin ceros de más', () => {
    expect(fmt(10.5)).toBe('10,5');
    expect(fmt(10)).toBe('10');
    expect(fmt(10.25, 2)).toBe('10,25');
    expect(fmt(10.2, 2)).toBe('10,2');
    expect(fmt(null)).toBe('–');
    expect(fmt(Infinity)).toBe('–');
  });
  it('fmtPace: s/km a m:ss, redondeando', () => {
    expect(fmtPace(300)).toBe('5:00');
    expect(fmtPace(269.6)).toBe('4:30');
    expect(fmtPace(59)).toBe('0:59');
    expect(fmtPace(0)).toBe('–');
    expect(fmtPace(NaN)).toBe('–');
  });
  it('fmtDur: con horas solo si hacen falta', () => {
    expect(fmtDur(2700)).toBe('45:00');
    expect(fmtDur(3725)).toBe('1:02:05');
  });
});

describe('lectura de números y tiempos', () => {
  it('num: acepta coma o punto; vacío es null y basura es NaN', () => {
    expect(num('10,5')).toBe(10.5);
    expect(num(' 7.25 ')).toBe(7.25);
    expect(num('')).toBeNull();
    expect(num(null)).toBeNull();
    expect(num('abc')).toBeNaN();
  });
  it('readHms y hmsFromSec van y vuelven', () => {
    expect(readHms({ h: '1', m: '2', s: '5' })).toBe(3725);
    expect(hmsFromSec(3725)).toEqual({ h: '1', m: '2', s: '5' });
    expect(readHms(hmsFromSec(2700))).toBe(2700);
    expect(readHms({ h: '', m: '', s: '' })).toBeNull();
  });
  it('readHms rechaza minutos o segundos de 60 o más', () => {
    expect(readHms({ h: '', m: '60', s: '0' })).toBeNaN();
    expect(readHms({ h: '', m: '10', s: '75' })).toBeNaN();
    expect(readHms({ h: '-1', m: '0', s: '0' })).toBeNaN();
  });
  it('readMs y msFromSec van y vuelven', () => {
    expect(readMs({ m: '4', s: '30' })).toBe(270);
    expect(msFromSec(270)).toEqual({ m: '4', s: '30' });
    expect(readMs({ m: '4', s: '60' })).toBeNaN();
  });
});

describe('fechas (hora local)', () => {
  it('pd y ymd van y vuelven', () => {
    expect(ymd(pd('2026-03-01'))).toBe('2026-03-01');
  });
  it('addDays cruza meses y años', () => {
    expect(ymd(addDays(pd('2026-12-30'), 3))).toBe('2027-01-02');
    expect(ymd(addDays(pd('2026-03-01'), -1))).toBe('2026-02-28');
  });
  it('mondayOf: la semana arranca el lunes (el domingo es del lunes anterior)', () => {
    expect(ymd(mondayOf(pd('2026-10-27')))).toBe('2026-10-26'); // martes
    expect(ymd(mondayOf(pd('2026-11-01')))).toBe('2026-10-26'); // domingo
    expect(ymd(mondayOf(pd('2026-10-26')))).toBe('2026-10-26'); // lunes
  });
  it('dayDiff cuenta días enteros', () => {
    expect(dayDiff(pd('2026-10-01'), pd('2026-10-31'))).toBe(30);
    expect(dayDiff(pd('2026-10-31'), pd('2026-10-01'))).toBe(-30);
  });
  it('isoWeek: la semana 1 es la del primer jueves', () => {
    expect(isoWeek(pd('2026-01-01'))).toBe(1); // jueves
    expect(isoWeek(pd('2027-01-01'))).toBe(53); // viernes: sigue en la última de 2026
    expect(isoWeek(pd('2026-10-27'))).toBe(44);
  });
  it('kmByMonth: un renglón por mes hasta hoy, con los vacíos en 0', () => {
    today('2026-10-15');
    const r = kmByMonth(
      [
        ['2026-08-03', 10],
        ['2026-08-20', 5.5],
        ['2026-10-01', 8],
      ],
      pd('2026-08-01'),
    );
    expect(r.map((x) => x.km)).toEqual([15.5, 0, 8]);
    expect(r.map((x) => x.cur)).toEqual([false, false, true]);
  });
});
