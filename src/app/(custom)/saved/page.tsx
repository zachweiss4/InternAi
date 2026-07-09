import type { Metadata } from 'next';
import { SavedIsland } from './saved-island';

export const metadata: Metadata = {
  title: 'Saved Internships - InternAI',
  description: 'Bookmark internships you are interested in.',
};

export default function SavedPage() {
  return (
    <main className="container-page py-section">
      <div className="mx-auto max-w-3xl">
        <SavedIsland />
      </div>
    </main>
  );
}
