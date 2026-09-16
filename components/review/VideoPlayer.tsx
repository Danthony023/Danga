interface VideoPlayerProps {
  outputUrl: string;
  label?: string;
}

export function VideoPlayer({ outputUrl, label }: VideoPlayerProps) {
  return (
    <div className="space-y-2">
      {label ? <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{label}</p> : null}
      <video src={outputUrl} controls className="w-full rounded-lg bg-black" />
    </div>
  );
}
