import { cn } from "@/lib/utils";

interface StorageMeterProps {
  usedBytes: number;
  limitBytes: number;
}

export function StorageMeter({ usedBytes, limitBytes }: StorageMeterProps) {
  const usedGb = usedBytes / (1024 * 1024 * 1024);
  const limitGb = limitBytes / (1024 * 1024 * 1024);
  const percent = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;

  const barColor =
    percent >= 95 ? "bg-red-500" : percent >= 80 ? "bg-amber-500" : "bg-violet-500";

  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Storage</span>
        <span className="text-zinc-500">
          {usedGb.toFixed(2)} / {limitGb.toFixed(2)} GB
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
