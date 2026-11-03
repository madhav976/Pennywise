import { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Reset Password — Pennywise',
  description: 'Set a new secure password for your Pennywise account.',
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}

