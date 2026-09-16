import { Logo } from "@/components/brand/logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div className="max-w-2xl space-y-4">
        <div className="flex justify-center">
          <Logo variant="full" priority className="h-10 max-w-[200px]" />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Describe your edit. Ship the video.
        </h1>
        <p className="text-lg text-zinc-500">
          AI-assisted video editing for short-form creators. Upload clips, chat your vision,
          and render finished videos with your saved style.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/signup">
          <Button>Get started</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary">Sign in</Button>
        </Link>
      </div>
    </main>
  );
}
