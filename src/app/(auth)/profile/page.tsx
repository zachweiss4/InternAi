// @:user-owned - seeded by /modules/better-auth; restyle freely.

import type { Metadata } from 'next';
import { ProfileIsland } from './profile-island';

export const metadata: Metadata = {
  title: 'Your Profile - InternAI',
  description: 'Manage your InternAI account details, university, and graduation year.',
};

export default function ProfilePage() {
  return <ProfileIsland />;
}
