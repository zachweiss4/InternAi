import type { Metadata } from 'next';
import { PaymentSuccessIsland } from './payment-success-island';

export const metadata: Metadata = {
  title: 'Payment Processing - InternAI',
  description: 'Confirming your InternAI subscription…',
};

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function PaymentSuccessPage({ searchParams }: Props) {
  const { session_id: sessionId } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center px-gutter">
      <PaymentSuccessIsland sessionId={sessionId ?? null} />
    </main>
  );
}
