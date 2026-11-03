import { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = {
  title: 'Forgot Password — Pennywise',
  description: 'Recover your Pennywise account password.',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}

