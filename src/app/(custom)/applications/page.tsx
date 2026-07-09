import type { Metadata } from 'next';
import { ApplicationsIsland } from './applications-island';

export const metadata: Metadata = {
  title: 'My Applications - InternAI',
  description: 'Track the internships you have applied to.',
};

export default function ApplicationsPage() {
  return (
    <main className="container-page py-section">
      <div className="mx-auto max-w-3xl">
        <ApplicationsIsland />
      </div>
    </main>
  );
}
