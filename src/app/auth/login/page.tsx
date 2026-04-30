import { Suspense } from 'react';
import AuthClient from './AuthClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Faça login ou crie sua conta no StakeHub.',
};

export default function LoginPage() {
  return (
    <Suspense>
      <AuthClient />
    </Suspense>
  );
}
