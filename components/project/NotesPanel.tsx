"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface NotesPanelProps {
  projectId: string;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export function NotesPanel({ projectId, notes, onNotesChange }: NotesPanelProps) {
  const [open, setOpen] = useState(Boolean(notes.trim()));
  const [savedNotes, setSavedNotes] = useState(notes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSavedNotes(notes);
  }, [notes]);

  async function saveNotes(value: string) {
    if (value === savedNotes) {
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/projects/${projectId}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: value }),
    });

    const payload = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setError(typeof payload.error === "string" ? payload.error : "Could not save notes.");
      return;
    }

    const nextNotes = typeof payload.notes === "string" ? payload.notes : value;
    setSavedNotes(nextNotes);
    onNotesChange(nextNotes);
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold tracking-tight">Notes</p>
          <p className="text-xs text-zinc-500">Scratchpad for this project — saved automatically.</p>
        </div>
        <span className="text-sm text-zinc-500">{open ? "Hide" : "Show"}</span>
      </button>

      <div className={cn("border-t border-zinc-200 px-4 pb-4 dark:border-zinc-800", !open && "hidden")}>
        <textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          onBlur={() => void saveNotes(notes)}
          rows={6}
          placeholder="Ideas, reminders, or context for your next edit…"
          className="mt-3 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-violet-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
          <span>{saving ? "Saving…" : "Saved on blur"}</span>
          {error ? <span className="text-red-600">{error}</span> : null}
        </div>
      </div>
    </div>
  );
}
