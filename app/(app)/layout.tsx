import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import Link from "next/link";
import { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Logo href="/dashboard" variant="full" priority />
          <nav className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 sm:gap-4">
            <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-white">
              Library
            </Link>
            <Link href="/projects/new" className="hover:text-zinc-900 dark:hover:text-white">
              New project
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</div>
    </div>
  );
}
