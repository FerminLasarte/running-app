import { appIcon } from '@/lib/appIcon';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/* iOS redondea las esquinas solo: va cuadrado */
export default function AppleIcon() {
  return appIcon(180);
}
