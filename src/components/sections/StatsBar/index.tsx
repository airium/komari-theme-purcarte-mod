import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  formatIsoTime,
  formatBytes,
  formatNetworkSpeedMbps,
  getNetworkSpeedColor,
} from "@/utils";
import { StatChip } from "./StatChips";
import { useLocale } from "@/config/hooks";
import type { StatsBarProps } from "./types";
export type { StatsBarProps };

const DISPLAY_ORDER = [
  "currentTime",
  "currentOnline",
  "regionOverview",
  "networkSpeed",
  "trafficOverview",
] as const;

const HIDE_ORDER = [
  "currentTime",
  "regionOverview",
  "trafficOverview",
  "networkSpeed",
  "currentOnline",
] as const;

const CHIP_GAP_PX = 6;

interface StatEntry {
  key: (typeof DISPLAY_ORDER)[number];
  label: string;
  lines: ReactNode[];
  textLeft?: boolean;
}

export const StatsBar = (props: StatsBarProps) => {
  const { stats, loading } = props;
  const { t } = useLocale();
  const [time, setTime] = useState(() => new Date());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRefs = useRef<Partial<Record<StatEntry["key"], HTMLDivElement | null>>>({});
  const [availableWidth, setAvailableWidth] = useState(0);
  const [chipWidths, setChipWidths] = useState<Partial<Record<StatEntry["key"], number>>>({});

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const resolvedStats = useMemo<StatEntry[]>(() => {
    const upColor = getNetworkSpeedColor(stats.currentSpeedUp);
    const downColor = getNetworkSpeedColor(stats.currentSpeedDown);

    return [
      {
        key: "currentTime",
        label: t("statsBar.currentTime"),
        lines: [formatIsoTime(time)],
      },
      {
        key: "currentOnline",
        label: t("statsBar.currentOnline"),
        lines: [loading ? "..." : `${stats.onlineCount} / ${stats.totalCount}`],
      },
      {
        key: "regionOverview",
        label: t("statsBar.region"),
        lines: [loading ? "..." : String(stats.uniqueRegions)],
      },
      {
        key: "networkSpeed",
        label: "",
        lines: loading
          ? ["..."]
          : [
              <span style={{ color: upColor }}>
                {`${t("node.uploadPrefix")} ${formatNetworkSpeedMbps(
                  stats.currentSpeedUp
                )}`}
              </span>,
              <span style={{ color: downColor }}>
                {`${t("node.downloadPrefix")} ${formatNetworkSpeedMbps(
                  stats.currentSpeedDown
                )}`}
              </span>,
            ],
        textLeft: true,
      },
      {
        key: "trafficOverview",
        label: "",
        lines: loading
          ? ["..."]
          : [
              `${t("node.uploadPrefix")} ${formatBytes(stats.totalTrafficUp)}`,
              `${t("node.downloadPrefix")} ${formatBytes(
                stats.totalTrafficDown
              )}`,
            ],
        textLeft: true,
      },
    ];
  }, [loading, stats, t, time]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateWidth = () => {
      setAvailableWidth(container.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const nextWidths = resolvedStats.reduce<
      Partial<Record<StatEntry["key"], number>>
    >((accumulator, item) => {
      accumulator[item.key] = measureRefs.current[item.key]?.offsetWidth ?? 0;
      return accumulator;
    }, {});

    setChipWidths((previousWidths) => {
      const hasChanged = DISPLAY_ORDER.some(
        (key) => previousWidths[key] !== nextWidths[key]
      );

      return hasChanged ? nextWidths : previousWidths;
    });
  }, [resolvedStats]);

  const visibleKeys = useMemo(() => {
    const getTotalWidth = (keys: readonly StatEntry["key"][]) => {
      const contentWidth = keys.reduce(
        (total, key) => total + (chipWidths[key] ?? 0),
        0
      );

      return contentWidth + Math.max(0, keys.length - 1) * CHIP_GAP_PX;
    };

    let keys = [...DISPLAY_ORDER];

    for (const key of HIDE_ORDER) {
      if (availableWidth <= 0 || getTotalWidth(keys) <= availableWidth) {
        break;
      }

      keys = keys.filter((itemKey) => itemKey !== key);
    }

    while (keys.length > 0 && availableWidth > 0 && getTotalWidth(keys) > availableWidth) {
      keys = keys.slice(0, -1);
    }

    return new Set(keys);
  }, [availableWidth, chipWidths]);

  return (
    <>
      <div
        ref={containerRef}
        className="flex w-full min-w-0 items-center justify-center overflow-hidden text-primary">
        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
          {resolvedStats.map(
            ({ key, ...rest }) =>
              visibleKeys.has(key) && <StatChip key={key} {...rest} />
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute -z-10 h-0 overflow-hidden opacity-0">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {resolvedStats.map(({ key, ...rest }) => (
            <div
              key={key}
              ref={(node) => {
                measureRefs.current[key] = node;
              }}>
              <StatChip {...rest} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
