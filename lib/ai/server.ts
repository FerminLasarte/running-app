/* Claude del lado del servidor. Solo funciona si está la variable ANTHROPIC_API_KEY (la clave de quien corre). */
import 'server-only';

export const AI_MODEL = 'claude-opus-5-5';
/* tope por pedido: el cuerpo de una función de Vercel no puede pasar de 4,5 MB, y el navegador achica cada captura */
export const AI_LIMITS = { images: true, maxCount: 6, mediaTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] };
export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY;
