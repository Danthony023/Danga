import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoVariant = "full" | "icon";

interface LogoProps {
  variant?: LogoVariant;
  href?: string;
  className?: string;
  priority?: boolean;
}

export function Logo({
  variant = "full",
  href,
  className,
  priority = false,
}: LogoProps) {
  const src = variant === "full" ? "/logo_with_text.png" : "/logo.png";
  const imageClass =
    variant === "full" ? "h-8 w-auto max-w-[160px] object-contain" : "h-8 w-8 object-contain";

  const image = (
    <Image
      src={src}
      alt="Danga"
      width={variant === "full" ? 160 : 32}
      height={32}
      priority={priority}
      className={cn(imageClass, className)}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 items-center">
        {image}
      </Link>
    );
  }

  return image;
}
