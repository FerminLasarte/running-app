'use client';
/* El estadio de Entrar: lo primero que se ve al volver a entrar ya es Lane One (va aparte porque las piezas de
   components/pista son del cliente y la página no) */
import { BrandTitle, Stadium } from '@/components/pista/structure';

export default function LoginHero() {
  return (
    <Stadium className="login-st">
      <span className="lbl">Registro y plan de entrenamiento</span>
      <BrandTitle as="div" className="login-h">
        A la
        <br />
        pista
      </BrandTitle>
    </Stadium>
  );
}
