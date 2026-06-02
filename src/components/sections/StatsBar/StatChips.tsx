import { memo, useEffect, useState, type ReactNode } from "react";
import { cn, formatIsoTime } from "@/utils";
import { useLocale } from "@/config/hooks";

export const StatChip = memo(
  ({
    label,
    lines,
    textLeft,
    className,
  }: {
    label: string;
    lines: ReactNode[];
    textLeft?: boolean;
    className?: string;
  }) => {
    return (
      <div
        className={cn(
          "flex shrink-0 flex-col items-center bg-transition px-1.5 py-0.5 text-center text-accent-foreground",
          className
        )}>
        {label && (
          <div className="text-xs font-semibold tracking-widest leading-none">
            {label}
          </div>
        )}
        <div
          className={cn(
            "text-xs font-semibold leading-tight whitespace-nowrap",
            label && "mt-0.5",
            textLeft && "text-left"
          )}>
          {lines.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      </div>
    );
  }
);

export const CurrentTimeChip = memo(
  ({ className }: { className?: string }) => {
    const [time, setTime] = useState(() => new Date());
    const { t } = useLocale();

    useEffect(() => {
      const timer = setInterval(() => setTime(new Date()), 1000);
      return () => clearInterval(timer);
    }, []);

    return (
      <StatChip
        key="currentTime"
        label={t("statsBar.currentTime")}
        lines={[formatIsoTime(time)]}
        className={className}
      />
    );
  }
);
