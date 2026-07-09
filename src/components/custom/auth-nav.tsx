// @:user-owned - seeded by /modules/better-auth; restyle freely.
'use client';

import { Button } from '@/components/ui/button';
import { signOut, useSession } from '@/lib/auth-client';

export function AuthNav() {
  const { data: session, isPending } = useSession();
  const subtleButtonClass =
    'rounded-full px-4 text-[var(--editorial-ink)] shadow-none hover:bg-[var(--editorial-sage)] hover:text-[var(--editorial-ink)]';
  const primaryButtonClass =
    'rounded-full bg-[var(--editorial-ink)] px-5 text-[var(--editorial-paper)] shadow-none hover:bg-[var(--editorial-moss-deep)] hover:text-[var(--editorial-paper)]';
  const publicLinks = (
    <nav className="flex items-center gap-2">
      <Button asChild variant="ghost" className={subtleButtonClass}>
        <a href="/login">Sign in</a>
      </Button>
      <Button asChild className={primaryButtonClass}>
        <a href="/signup">Sign up</a>
      </Button>
    </nav>
  );

  if (isPending) return publicLinks;

  if (!session?.user) return publicLinks;

  return (
    <nav className="flex items-center gap-2">
      {session.user.role === 'admin' && (
        <Button asChild variant="ghost" className={subtleButtonClass}>
          <a href="/admin/premium">Admin</a>
        </Button>
      )}
      <Button asChild variant="ghost" className={subtleButtonClass}>
        <a href="/billing">Billing</a>
      </Button>
      <Button asChild variant="ghost" className={subtleButtonClass}>
        <a href="/profile">Profile</a>
      </Button>
      <Button
        variant="secondary"
        className="rounded-full bg-[var(--editorial-sage)] px-4 text-[var(--editorial-ink)] shadow-none hover:bg-[var(--editorial-cream-deep)]"
        onClick={async () => {
          await signOut();
          window.location.assign('/');
        }}
      >
        Sign out
      </Button>
    </nav>
  );
}
