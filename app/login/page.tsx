import '@/app/styles/screens/login.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoginForm from './LoginForm';
import LoginHero from './LoginHero';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <main className="login">
      <LoginHero />
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
