"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";

interface StyleChipsProps {
  initialTraits: string[];
}

export function StyleChips({ initialTraits }: StyleChipsProps) {
  const [traits, setTraits] = useState(initialTraits);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveTraits(nextTraits: string[]) {
    setSaving(true);
    setError(null);

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style_traits: nextTraits }),
    });

    const payload = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(typeof payload.error === "string" ? payload.error : "Could not save style.");
      return false;
    }

    const saved = Array.isArray(payload.style_traits)
      ? payload.style_traits.filter((trait: unknown): trait is string => typeof trait === "string")
      : nextTraits;

    setTraits(saved);
    return true;
  }

  async function handleAddTrait() {
    const value = draft.trim();
    if (!value || traits.includes(value)) {
      setDraft("");
      return;
    }

    const ok = await saveTraits([...traits, value]);
    if (ok) {
      setDraft("");
    }
  }

  async function handleRemoveTrait(trait: string) {
    await saveTraits(traits.filter((item) => item !== trait));
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Style profile</h2>
          <p className="text-sm text-zinc-500">
            Traits Danga remembers for your edits across sessions.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setEditing((value) => !value)}>
          {editing ? "Done" : "Edit style"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {traits.length === 0 ? (
          <p className="text-sm text-zinc-500">No style traits yet.</p>
        ) : (
          traits.map((trait) => (
            <Chip
              key={trait}
              removable={editing}
              onClick={() => {
                if (editing) {
                  void handleRemoveTrait(trait);
                }
              }}
            >
              {trait}
            </Chip>
          ))
        )}
      </div>

      {editing ? (
        <div className="flex flex-wrap gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a style trait…"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleAddTrait();
              }
            }}
          />
          <Button disabled={saving || !draft.trim()} onClick={() => void handleAddTrait()}>
            Add
          </Button>
        </div>
      ) : null}

      {saving ? <p className="text-xs text-zinc-500">Saving…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
