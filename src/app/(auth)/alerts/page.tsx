import type { Metadata } from 'next';
import { AlertsIsland } from './alerts-island';

export const metadata: Metadata = {
  title: 'Job Alerts - InternAI',
  description: 'Create and manage internship alert notifications.',
};

export default function AlertsPage() {
  return <AlertsIsland />;
}
