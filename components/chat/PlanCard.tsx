"use client";

import { APPROVED_ALTERNATIVES } from "@/lib/ai/alternatives";
import type { EditPlan } from "@/lib/types/project";
import { Button } from "@/components/ui/button";

export type UsageSummary = {
  renders_used: number;
  renders_limit: number;
  messages_used: number;
  messages_limit: number;
  renders_remaining: number;
  messages_remaining: number;
};

interface PlanCardProps {
  plan: EditPlan;
  usage: UsageSummary;
  onAdjust: () => void;
  onRender: () => void;
  rendering?: boolean;
}

export function PlanCard({ plan, usage, onAdjust, onRender, rendering }: PlanCardProps) {
  return (
    <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
          Edit plan
        </h3>
        <ol className="mt-3 space-y-2">
          {plan.plan_items.map((item) => (
            <li key={item.step} className="text-sm text-zinc-800 dark:text-zinc-100">
              <span className="font-medium">{item.step}.</span> {item.description}
            </li>
          ))}
        </ol>
      </div>

      {plan.unachievable.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            Outside Danga
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900 dark:text-amber-100">
            {plan.unachievable.map((item) => (
              <li key={`${item.task}-${item.suggested_alternative}`}>
                {item.task}:{" "}
                {APPROVED_ALTERNATIVES[item.suggested_alternative] ??
                  item.suggested_alternative}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="text-xs text-zinc-600 dark:text-zinc-400">
        Rendering uses 1 credit · {usage.renders_remaining} render
        {usage.renders_remaining === 1 ? "" : "s"} left this month ({usage.renders_used}/
        {usage.renders_limit} used)
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onAdjust} disabled={rendering}>
          Adjust
        </Button>
        <Button onClick={onRender} disabled={rendering || !plan.render_ready}>
          {rendering ? "Starting render…" : "Render it"}
        </Button>
      </div>
    </div>
  );
}
