import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  cn,
  formatBytes,
  formatNetworkSpeedMbps,
  getNetworkSpeedColor,
} from "@/utils";
import { useAppConfig } from "@/config";
import { useIsMobile } from "@/hooks/useMobile";
import { CurrentTimeChip, StatChip } from "./StatChips";
import { SortToggleMenu } from "./SortToggleMenu";
import { useLocale } from "@/config/hooks";
import type { StatsBarProps, SortKey } from "./types";
import { Card } from "@/components/ui/card";
export type { StatsBarProps };

interface StatEntry {
  key: string;
  label: string;
  lines: ReactNode[];
  isLabelVertical?: boolean;
  textLeft?: boolean;
}

export const StatsBar = (props: StatsBarProps) => {
  const {
    stats,
    loading,
    onSort: onSortProp,
    sortKey: sortKeyProp,
    sortDirection: sortDirectionProp,
  } = props;

  const [sortState, setSortState] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({
    key: sortKeyProp ?? null,
    direction: sortDirectionProp ?? "desc",
  });

  useEffect(() => {
    setSortState({
      key: sortKeyProp ?? null,
      direction: sortDirectionProp ?? "desc",
    });
  }, [sortKeyProp, sortDirectionProp]);

  const { key: sortKey, direction: sortDirection } = sortState;

  const handleSort = (key: SortKey) => {
    let newDirection: "asc" | "desc" = "desc";
    if (key !== null && key === sortKey) {
      newDirection = sortDirection === "desc" ? "asc" : "desc";
    }
    setSortState({ key, direction: newDirection });
    if (onSortProp) {
      onSortProp(key, newDirection);
    }
  };

  const {
    isShowStatsInHeader,
    enableSortControl,
  } = useAppConfig();
  const isMobile = useIsMobile();
  const { t } = useLocale();

  const resolvedStats = useMemo<StatEntry[]>(() => {
    const getLabel = (compactLabel: string, fullLabel: string) =>
      isShowStatsInHeader ? (isMobile ? fullLabel : compactLabel) : fullLabel;

    const upColor = getNetworkSpeedColor(stats.currentSpeedUp);
    const downColor = getNetworkSpeedColor(stats.currentSpeedDown);

    return [
      {
        key: "currentOnline",
        label: getLabel(
          t("statsBar.currentOnline"),
          t("statsBar.currentOnline")
        ),
        lines: [loading ? "..." : `${stats.onlineCount} / ${stats.totalCount}`],
      },
      {
        key: "regionOverview",
        label: getLabel(t("statsBar.region"), t("statsBar.region")),
        lines: [loading ? "..." : String(stats.uniqueRegions)],
      },
      {
        key: "trafficOverview",
        label: getLabel("", t("statsBar.traffic")),
        lines: loading
          ? ["..."]
          : [
              `${t("node.uploadPrefix")} ${formatBytes(stats.totalTrafficUp)}`,
              `${t("node.downloadPrefix")} ${formatBytes(
                stats.totalTrafficDown
              )}`,
            ],
        isLabelVertical: !isMobile && isShowStatsInHeader,
        textLeft: true,
      },
      {
        key: "networkSpeed",
        label: getLabel("", t("statsBar.networkSpeed")),
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
        isLabelVertical: !isMobile && isShowStatsInHeader,
        textLeft: true,
      },
    ];
  }, [loading, stats, isMobile, isShowStatsInHeader, t]);

  if (isShowStatsInHeader && !isMobile) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <CurrentTimeChip isInHeader={true} isMobile={isMobile} />
          {resolvedStats.map(({ key, ...rest }) => (
            <StatChip
              key={key}
              {...rest}
              isInHeader={true}
              isMobile={isMobile}
            />
          ))}
          {enableSortControl && (
            <SortToggleMenu
              onSort={handleSort}
              sortKey={sortKey}
              sortDirection={sortDirection}
            />
          )}
        </div>
      </div>
    );
  }

  const getGridTemplateColumns = () => {
    if (!isMobile) {
      return "repeat(auto-fit, minmax(100px, 1fr))";
    }
    const visibleCount = resolvedStats.length + 1;

    return visibleCount >= 5 ? "repeat(3, 1fr)" : "repeat(2, 1fr)";
  };

  return (
    <Card
      className={cn(
        "relative flex items-center text-primary my-4",
        isMobile ? "text-xs p-2" : "text-sm px-4 min-w-[300px] min-h-[5rem]"
      )}>
      <div
        className="grid w-full gap-2 text-center items-center py-3"
        style={{
          gridTemplateColumns: getGridTemplateColumns(),
          gridAutoRows: "min-content",
        }}>
        <CurrentTimeChip isMobile={isMobile} />
        {resolvedStats.map(({ key, ...rest }) => (
          <StatChip key={key} {...rest} isMobile={isMobile} />
        ))}
      </div>
      {enableSortControl && (
        <div className="absolute right-2">
          <SortToggleMenu
            onSort={handleSort}
            sortKey={sortKey}
            sortDirection={sortDirection}
          />
        </div>
      )}
    </Card>
  );
};
