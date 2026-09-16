"use client";

import { Logo } from "@/components/brand/logo";
import { extractFirstFrameBase64 } from "@/lib/onboarding/video-frame";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const MUSIC_PRESETS = ["Afrobeats", "Lo-fi", "Drill", "No music"] as const;

export function OnboardingClient() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [traits, setTraits] = useState<string[]>([]);
  const [draftTrait, setDraftTrait] = useState("");
  const [musicVibe, setMusicVibe] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVideoUpload(file: File) {
    setAnalysing(true);
    setError(null);

    try {
      const imageBase64 = await extractFirstFrameBase64(file);
      const response = await fetch("/api/onboarding/analyse-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Analysis failed.");
        return;
      }

      setTraits(Array.isArray(payload.traits) ? payload.traits : []);
    } catch {
      setError("Could not analyze that video. Try another file.");
    } finally {
      setAnalysing(false);
    }
  }

  function addTrait() {
    const value = draftTrait.trim();
    if (!value || traits.includes(value)) {
      setDraftTrait("");
      return;
    }
    setTraits((current) => [...current, value]);
    setDraftTrait("");
  }

  async function finishOnboarding(styleTraits: string[]) {
    setSaving(true);
    setError(null);

    const response = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style_traits: styleTraits }),
    });

    setSaving(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(typeof payload.error === "string" ? payload.error : "Could not save profile.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  function handleContinueToStep2() {
    if (traits.length === 0) {
      setError("Add at least one style trait or skip onboarding.");
      return;
    }
    setError(null);
    setStep(2);
  }

  function handleFinish() {
    const musicTrait = musicVibe.trim()
      ? [`Music vibe: ${musicVibe.trim()}`]
      : [];
    void finishOnboarding([...traits, ...musicTrait]);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Logo variant="full" className="h-8" />
          <h1 className="text-2xl font-semibold tracking-tight">Welcome</h1>
          <p className="text-sm text-zinc-500">Step {step} of 2 — always skippable.</p>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost">Skip</Button>
        </Link>
      </div>

      {step === 1 ? (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <h2 className="text-lg font-semibold">Show us a past piece of work</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Upload a video from your device. We&apos;ll read the first frame to learn your visual
              style — no URLs, upload only.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.mov,video/mp4,video/quicktime"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleVideoUpload(file);
              }
              event.target.value = "";
            }}
          />

          <Button
            variant="secondary"
            disabled={analysing}
            onClick={() => fileInputRef.current?.click()}
          >
            {analysing ? "Analyzing style…" : "Upload sample video"}
          </Button>

          {traits.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Detected style traits</p>
              <div className="flex flex-wrap gap-2">
                {traits.map((trait) => (
                  <Chip
                    key={trait}
                    removable
                    onClick={() => setTraits((current) => current.filter((item) => item !== trait))}
                  >
                    {trait}
                  </Chip>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  value={draftTrait}
                  onChange={(event) => setDraftTrait(event.target.value)}
                  placeholder="Add a trait…"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTrait();
                    }
                  }}
                />
                <Button variant="secondary" onClick={addTrait}>
                  Add
                </Button>
              </div>
            </div>
          ) : null}

          <Button onClick={handleContinueToStep2} disabled={analysing || traits.length === 0}>
            Continue
          </Button>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <h2 className="text-lg font-semibold">What&apos;s your usual music vibe?</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Pick a preset or describe your own. This gets saved to your style profile.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {MUSIC_PRESETS.map((preset) => (
              <Chip
                key={preset}
                selected={musicVibe === preset}
                onClick={() => setMusicVibe(preset)}
              >
                {preset}
              </Chip>
            ))}
          </div>

          <Input
            value={musicVibe}
            onChange={(event) => setMusicVibe(event.target.value)}
            placeholder="Or type your own vibe…"
          />

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button disabled={saving} onClick={handleFinish}>
              {saving ? "Saving…" : "Finish setup"}
            </Button>
          </div>
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
