import {
  cn,
  formatBytes,
  formatNetworkSpeedMbps,
  formatOfflineHours,
  formatPercentage,
  formatPrice,
  formatUptime,
  formatUptimeValue,
  getExpiryDaysLeftColor,
  getTrafficLimitTypeLabel,
  getNetworkSpeedColor,
  getOSImage,
  getRegionDisplayName,
  getUptimeHoursColor,
} from "@/utils";
import type { NodeData } from "@/types/node";
import { Link } from "react-router-dom";
import {
  CpuIcon,
  MemoryStickIcon,
  HardDriveIcon,
  ChevronRight,
} from "lucide-react";
import Flag from "./Flag";
import { Tag } from "../ui/tag";
import { useNodeCommons } from "@/hooks/useNodeCommons";
import { ProgressBar } from "../ui/progress-bar";
import { useState, useEffect, useMemo, useRef } from "react";
import Instance from "@/pages/instance/Instance";
import PingChart from "@/pages/instance/PingChart";
import { useAppConfig } from "@/config";
import { useLocale } from "@/config/hooks";
import { Card } from "../ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

interface NodeTableProps {
  nodes: NodeData[];
  enableListItemProgressBar: boolean;
}

interface TableColumnDefinition {
  minRem: number;
  maxRem: number;
  weight: number;
}

interface ResolvedTableLayout {
  columnWidthsRem: number[];
  totalWidthPx: number;
  template: string;
}

const TABLE_COLUMN_INDEX = {
  name: 1,
  tags: 2,
  expiry: 3,
  cpu: 5,
  ram: 6,
  disk: 7,
  quota: 10,
} as const;

// Native CSS Grid cannot combine a hard min, hard max, and weighted fr growth
// for the same track, so the table resolves exact pixel widths from metadata.
const TABLE_COLUMNS: TableColumnDefinition[] = [
  { minRem: 1, maxRem: 1, weight: 0 },   // #
  { minRem: 2.5, maxRem: 7, weight: 6 },  // name
  { minRem: 0, maxRem: 20, weight: 1 }, // tags
  { minRem: 0, maxRem: 4.5, weight: 1 },   // expire
  { minRem: 2.4, maxRem: 3.2, weight: 10 },   // uptime
  { minRem: 2, maxRem: 10, weight: 4 },  // cpu
  { minRem: 2, maxRem: 10, weight: 4 },   // ram
  { minRem: 2, maxRem: 10, weight: 4 },   // stor
  { minRem: 3.6, maxRem: 4.2, weight: 2 },   // speed
  { minRem: 3.1, maxRem: 3.2, weight: 2 },   // traffic
  { minRem: 2, maxRem: 10, weight: 4 },  // quota
];

const TABLE_COLUMN_TEMPLATE = TABLE_COLUMNS.map(
  (column) => `${column.minRem}rem`
).join(" ");

const TABLE_TRACK_MIN_WIDTH_REM = TABLE_COLUMNS.reduce(
  (total, column) => total + column.minRem,
  0
);

// Keep these in sync with `px-1`, `gap-x-1`, `p-1`, and the 1px Card border.
const TABLE_WRAPPER_PADDING_X_REM = 0.5;
const TABLE_CARD_PADDING_X_REM = 0.5;
const TABLE_CARD_BORDER_X_REM = 0.125;
const TABLE_COLUMN_GAP_REM = 0.25;
const TABLE_NON_TRACK_WIDTH_REM =
  TABLE_WRAPPER_PADDING_X_REM +
  TABLE_CARD_PADDING_X_REM +
  TABLE_CARD_BORDER_X_REM +
  (TABLE_COLUMNS.length - 1) * TABLE_COLUMN_GAP_REM;

const TABLE_MIN_WIDTH_REM =
  TABLE_TRACK_MIN_WIDTH_REM + TABLE_NON_TRACK_WIDTH_REM;
const TABLE_TRACK_MAX_WIDTH_REM = TABLE_COLUMNS.reduce(
  (total, column) => total + column.maxRem,
  0
);
const TABLE_MAX_WIDTH_REM =
  TABLE_TRACK_MAX_WIDTH_REM + TABLE_NON_TRACK_WIDTH_REM;
export const NODE_TABLE_MAX_WIDTH_REM = TABLE_MAX_WIDTH_REM;

const PROGRESS_COLUMN_COMPACT_OFFSET_REM = 4;
const ZERO_MIN_COLUMN_HIDE_THRESHOLD_REM = 2;
const NAME_COLUMN_HIDE_PRICE_THRESHOLD_REM = 4.5;

const getRootFontSize = () => {
  if (typeof window === "undefined") {
    return 16;
  }

  const fontSize = Number.parseFloat(
    window.getComputedStyle(document.documentElement).fontSize
  );

  return Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 16;
};

const getMinTableLayout = (): ResolvedTableLayout => ({
  columnWidthsRem: TABLE_COLUMNS.map((column) => column.minRem),
  totalWidthPx: TABLE_MIN_WIDTH_REM * getRootFontSize(),
  template: TABLE_COLUMN_TEMPLATE,
});

const buildTableLayout = (availableWidthPx: number): ResolvedTableLayout => {
  const rootFontSize = getRootFontSize();
  const availableTrackWidthPx = Math.max(
    availableWidthPx - TABLE_NON_TRACK_WIDTH_REM * rootFontSize,
    0
  );
  const columns = TABLE_COLUMNS.map((column) => ({
    currentWidthPx: column.minRem * rootFontSize,
    maxWidthPx: column.maxRem * rootFontSize,
    weight: column.weight,
  }));

  let remainingWidthPx = Math.max(
    availableTrackWidthPx -
      columns.reduce((total, column) => total + column.currentWidthPx, 0),
    0
  );
  let growableColumns = columns.filter(
    (column) => column.weight > 0 && column.maxWidthPx > column.currentWidthPx
  );

  while (remainingWidthPx > 0.5 && growableColumns.length > 0) {
    const totalWeight = growableColumns.reduce(
      (total, column) => total + column.weight,
      0
    );

    let distributedWidthPx = 0;

    for (const column of growableColumns) {
      const weightedSharePx = (remainingWidthPx * column.weight) / totalWeight;
      const appliedWidthPx = Math.min(
        weightedSharePx,
        column.maxWidthPx - column.currentWidthPx
      );

      column.currentWidthPx += appliedWidthPx;
      distributedWidthPx += appliedWidthPx;
    }

    if (distributedWidthPx <= 0.5) {
      break;
    }

    remainingWidthPx -= distributedWidthPx;
    growableColumns = growableColumns.filter(
      (column) => column.maxWidthPx - column.currentWidthPx > 0.5
    );
  }

  return {
    columnWidthsRem: columns.map((column) => column.currentWidthPx / rootFontSize),
    totalWidthPx:
      columns.reduce((total, column) => total + column.currentWidthPx, 0) +
      TABLE_NON_TRACK_WIDTH_REM * rootFontSize,
    template: columns.map((column) => `${column.currentWidthPx.toFixed(2)}px`).join(" "),
  };
};

const isCompactProgressColumn = (
  columnIndex: number,
  columnWidthsRem: number[]
) => columnWidthsRem[columnIndex] < TABLE_COLUMNS[columnIndex].maxRem - PROGRESS_COLUMN_COMPACT_OFFSET_REM;

const shouldHideZeroMinColumnContent = (
  columnIndex: number,
  columnWidthsRem: number[]
) =>
  TABLE_COLUMNS[columnIndex].minRem === 0 &&
  columnWidthsRem[columnIndex] < ZERO_MIN_COLUMN_HIDE_THRESHOLD_REM;

const TWO_LINE_CELL_CLASS = "min-w-0 h-9 grid grid-rows-2 items-center";

export const NodeTable = ({
  nodes,
  enableListItemProgressBar,
}: NodeTableProps) => {
  const { t } = useLocale();
  const viewportRef =
    useRef<React.ElementRef<typeof ScrollAreaPrimitive.Viewport>>(null);
  const [availableTableWidthPx, setAvailableTableWidthPx] = useState<number | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const updateWidth = (nextWidth: number) => {
      setAvailableTableWidthPx((currentWidth) =>
        currentWidth !== nextWidth ? nextWidth : currentWidth
      );
    };

    const readContentWidth = () => {
      const mainContent = viewport.closest("main");
      const mainContentWidth =
        mainContent instanceof HTMLElement ? mainContent.clientWidth : viewport.clientWidth;

      updateWidth(Math.max(Math.min(viewport.clientWidth, mainContentWidth), 0));
    };

    readContentWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", readContentWidth);
      return () => window.removeEventListener("resize", readContentWidth);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      readContentWidth();
    });

    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  const tableLayout = useMemo(() => {
    if (!availableTableWidthPx) {
      return getMinTableLayout();
    }

    return buildTableLayout(availableTableWidthPx);
  }, [availableTableWidthPx]);

  const hideTagsHeader = shouldHideZeroMinColumnContent(
    TABLE_COLUMN_INDEX.tags,
    tableLayout.columnWidthsRem
  );
  const hideExpiryHeader = shouldHideZeroMinColumnContent(
    TABLE_COLUMN_INDEX.expiry,
    tableLayout.columnWidthsRem
  );

  return (
    <ScrollArea
      className="w-full"
      showHorizontalScrollbar
      viewportRef={viewportRef}>
      <div
        className="box-border px-1 pb-1 mx-auto"
        style={{
          minWidth: `${TABLE_MIN_WIDTH_REM}rem`,
          width: `${tableLayout.totalWidthPx}px`,
          maxWidth: `min(${TABLE_MAX_WIDTH_REM}rem, var(--main-width))`,
        }}>
        <div className="space-y-0.5">
          <Card
            className="theme-card-style text-primary font-semibold grid gap-x-1 gap-y-1 p-1 items-center text-xs"
            style={{ gridTemplateColumns: tableLayout.template }}>
            <div className="text-center"></div>
            <div className="text-left">{t("node.name")}</div>
            <div className="text-left truncate rt-r-min-w-0 min-w-0">
              {hideTagsHeader ? "" : t("node.tags")}
            </div>
            <div className="text-right truncate rt-r-min-w-0 min-w-0">
              {hideExpiryHeader ? "" : t("node.expiredAt")}
            </div>
            <div className="text-right">{t("node.uptime")}</div>
            <div className="text-left flex items-center gap-1">
              <CpuIcon className="size-4 text-blue-600" />
              <span>{t("node.cpu")}</span>
            </div>
            <div className="text-left flex items-center gap-1">
              <MemoryStickIcon className="size-4 text-green-600" />
              <span>{t("node.mem")}</span>
            </div>
            <div className="text-left flex items-center gap-1">
              <HardDriveIcon className="size-4 text-red-600" />
              <span>{t("node.disk")}</span>
            </div>
            <div className="text-center">{t("node.speed")}</div>
            <div className="text-center">{t("node.traffic")}</div>
            <div className="text-center">{t("node.quota")}</div>
          </Card>
          {nodes.map((node) => (
            <NodeTableRow
              columnTemplate={tableLayout.template}
              columnWidthsRem={tableLayout.columnWidthsRem}
              key={node.uuid}
              node={node}
              enableListItemProgressBar={enableListItemProgressBar}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};

interface NodeTableRowProps {
  columnTemplate: string;
  columnWidthsRem: number[];
  node: NodeData;
  enableListItemProgressBar: boolean;
}

const NodeTableRow = ({
  columnTemplate,
  columnWidthsRem,
  node,
  enableListItemProgressBar,
}: NodeTableRowProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRenderChart, setShouldRenderChart] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRenderChart(true);
    }
  }, [isOpen]);

  const {
    stats,
    isOnline,
    cpuUsage,
    memUsage,
    diskUsage,
    load,
    expired_at,
    trafficPercentage,
  } = useNodeCommons(node);
  const { pingChartTimeInPreview, enableInstanceDetail, enablePingChart } =
    useAppConfig();
  const { t } = useLocale();

  const customTags = useMemo(() => {
    if (typeof node.tags !== "string") return [];
    return node.tags
      .split(";")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }, [node.tags]);

  const regionName = getRegionDisplayName(node.region, "en");
  const nodePrice = formatPrice(node.price, node.currency, node.billing_cycle, {
    free: t("node.free"),
    billingCycleDays: t("node.billingCycleDays", { days: "{days}" }),
    billingCycleMonth: t("node.billingCycleMonth"),
    billingCycleQuarter: t("node.billingCycleQuarter"),
    billingCycleHalfYear: t("node.billingCycleHalfYear"),
    billingCycleYear: t("node.billingCycleYear"),
    billingCycleTwoYears: t("node.billingCycleTwoYears"),
    billingCycleThreeYears: t("node.billingCycleThreeYears"),
    billingCycleFiveYears: t("node.billingCycleFiveYears"),
  });
  const trafficType = node.traffic_limit_type || "max";
  const trafficTypeText = getTrafficLimitTypeLabel(trafficType, {
    sum: t("node.trafficTypeSum"),
    max: t("node.trafficTypeMax"),
    min: t("node.trafficTypeMin"),
    up: t("node.trafficTypeUp"),
    down: t("node.trafficTypeDown"),
  });
  const hasTrafficLimit =
    typeof node.traffic_limit === "number" && node.traffic_limit > 0;
  const isUnlimitedTraffic = node.traffic_limit === 0;

  const usedTraffic = useMemo(() => {
    if (!stats) return 0;

    switch (trafficType) {
      case "up":
        return stats.net_total_up;
      case "down":
        return stats.net_total_down;
      case "sum":
        return stats.net_total_up + stats.net_total_down;
      case "min":
        return Math.min(stats.net_total_up, stats.net_total_down);
      default:
        return Math.max(stats.net_total_up, stats.net_total_down);
    }
  }, [stats, trafficType]);

  const trafficQuotaSummary = useMemo(() => {
    if (isUnlimitedTraffic) {
      return "∞";
    }

    if (!hasTrafficLimit) {
      return t("node.notSet");
    }

    if (!stats || !isOnline) {
      return `${t("node.notAvailable")} (${t("node.notAvailable")} / ${formatBytes(
        node.traffic_limit || 0
      )} ${trafficTypeText})`;
    }

    return `${formatPercentage(trafficPercentage)} (${formatBytes(
      usedTraffic
    )} / ${formatBytes(node.traffic_limit || 0)} ${trafficTypeText})`;
  }, [
    hasTrafficLimit,
    isOnline,
    isUnlimitedTraffic,
    node.traffic_limit,
    stats,
    t,
    trafficPercentage,
    trafficTypeText,
    usedTraffic,
  ]);

  const remainingInfo = useMemo(() => {
    if (!node.expired_at || new Date(node.expired_at).getTime() <= 0) {
      return { text: "", color: "" };
    }

    const daysLeft = Math.ceil(
      (new Date(node.expired_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft > 36500) return { text: "", color: "" };
    if (daysLeft < 0) {
      return { text: t("node.expired"), color: getExpiryDaysLeftColor(1) };
    }

    return {
      text: t("node.daysLeft", { daysLeft }),
      color: getExpiryDaysLeftColor(daysLeft),
    };
  }, [node.expired_at, t]);

  const loadLine = load.split("|").map((item) => item.trim()).join(", ");
  const cpuSummary = isOnline
    ? `${node.cpu_cores}C @ ${formatPercentage(cpuUsage)} (${loadLine})`
    : `${node.cpu_cores}C @ ${t("node.notAvailable")} (${t("node.notAvailable")})`;

  const memSummary = isOnline && stats
    ? `${formatPercentage(memUsage)} (${formatBytes(stats.ram)} / ${formatBytes(
        node.mem_total
      )})`
    : `${t("node.notAvailable")} (${formatBytes(node.mem_total)})`;

  const diskSummary = isOnline && stats
    ? `${formatPercentage(diskUsage)} (${formatBytes(stats.disk)} / ${formatBytes(
        node.disk_total
      )})`
    : `${t("node.notAvailable")} (${formatBytes(node.disk_total)})`;

  const compactCpuSummary = isOnline
    ? formatPercentage(cpuUsage)
    : t("node.notAvailable");
  const compactMemSummary = isOnline && stats
    ? formatPercentage(memUsage)
    : t("node.notAvailable");
  const compactDiskSummary = isOnline && stats
    ? formatPercentage(diskUsage)
    : t("node.notAvailable");
  const compactTrafficQuotaSummary = isUnlimitedTraffic
    ? "∞"
    : hasTrafficLimit && stats && isOnline
      ? formatPercentage(trafficPercentage)
      : !hasTrafficLimit
        ? t("node.notSet")
        : t("node.notAvailable");

  const hideTagsContent = shouldHideZeroMinColumnContent(
    TABLE_COLUMN_INDEX.tags,
    columnWidthsRem
  );
  const hideNamePriceContent =
    columnWidthsRem[TABLE_COLUMN_INDEX.name] < NAME_COLUMN_HIDE_PRICE_THRESHOLD_REM;
  const hideExpiryContent = shouldHideZeroMinColumnContent(
    TABLE_COLUMN_INDEX.expiry,
    columnWidthsRem
  );
  const compactCpuContent = isCompactProgressColumn(
    TABLE_COLUMN_INDEX.cpu,
    columnWidthsRem
  );
  const compactMemContent = isCompactProgressColumn(
    TABLE_COLUMN_INDEX.ram,
    columnWidthsRem
  );
  const compactDiskContent = isCompactProgressColumn(
    TABLE_COLUMN_INDEX.disk,
    columnWidthsRem
  );
  const compactQuotaContent = isCompactProgressColumn(
    TABLE_COLUMN_INDEX.quota,
    columnWidthsRem
  );
  const uptimeDisplay = stats ? formatUptimeValue(stats.uptime) : null;
  const lastReportTime =
    stats && typeof stats === "object"
      ? ("time" in stats && typeof stats.time === "string" && stats.time) ||
        ("updated_at" in stats && typeof stats.updated_at === "string" && stats.updated_at) ||
        node.updated_at
      : node.updated_at;
  const offlineHours = formatOfflineHours(lastReportTime);

  return (
    <Card
      className={cn(
        "relative",
        isOpen ? "z-20" : "z-0",
        !isOnline
          ? "striped-bg-red-translucent-diagonal ring-2 ring-red-500/50"
          : ""
      )}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="grid gap-x-1 gap-y-1 p-1 min-h-[40px] text-primary transition-colors duration-200 cursor-pointer items-center text-xs"
        style={{ gridTemplateColumns: columnTemplate }}>
        <div className="flex justify-center pt-0.5">
          <ChevronRight
            className={`transition-transform size-4 ${isOpen ? "rotate-90" : ""}`}
          />
        </div>

        <div className={cn(TWO_LINE_CELL_CLASS, "text-left leading-tight h-[40px]")}>
          <Link
            to={`/instance/${node.uuid}`}
            onClick={(e) => e.stopPropagation()}
            className="block hover:underline hover:text-(--accent-11) truncate text-sm font-semibold">
            {node.name}
          </Link>
          <div className="mt-0.5 flex items-center gap-1 text-secondary-foreground min-w-0 truncate">
            <span title={regionName} className="inline-flex items-center">
              <Flag flag={node.region} size={"4"} />
            </span>
            <span title={node.os} className="inline-flex items-center">
              <img
                src={getOSImage(node.os)}
                alt={node.os}
                className="size-4 object-contain"
                loading="lazy"
              />
            </span>
            {!hideNamePriceContent ? (
              <span className="truncate">{nodePrice || ""}</span>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 text-left h-[40px]">
          {hideTagsContent ? null : customTags.length > 0 ? (
            <div className="max-h-[40px] overflow-hidden">
              <Tag
                className="!gap-0.5 origin-top-left scale-92 [&_.rt-Badge]:!text-[10px] [&_[data-accent-color]]:!text-[10px]"
                tags={customTags}
              />
            </div>
          ) : (
            <div className="truncate text-secondary-foreground">-</div>
          )}
        </div>

        <div className={cn(TWO_LINE_CELL_CLASS, "text-right leading-tight h-[40px]")}>
          <div className="truncate">{hideExpiryContent ? "" : expired_at}</div>
          <div className="truncate text-secondary-foreground">
            {!hideExpiryContent && remainingInfo.text ? (
              <span style={{ color: remainingInfo.color }}>{remainingInfo.text}</span>
            ) : (
              ""
            )}
          </div>
        </div>

        <div className={cn(TWO_LINE_CELL_CLASS, "text-right leading-tight h-[40px]")}>
          <div className="truncate">
            {isOnline && stats ? (
              <span style={{ color: getUptimeHoursColor(uptimeDisplay?.hours ?? stats.uptime / 3600) }}>
                {`${uptimeDisplay?.value ?? formatUptime(stats.uptime)} ${uptimeDisplay?.unit ?? "hr"}`}
              </span>
            ) : (
              <span className="text-red-500">{`${offlineHours} hr`}</span>
            )}
          </div>
          <div className="truncate text-red-500">{isOnline ? "" : "OFFLINE"}</div>
        </div>

        <div className={cn(TWO_LINE_CELL_CLASS, "text-left leading-tight h-[40px]")}>
          <div className="truncate" title={cpuSummary}>
            {compactCpuContent ? compactCpuSummary : cpuSummary}
          </div>
          <div className="flex items-center h-2">
            {enableListItemProgressBar ? <ProgressBar value={cpuUsage} h="h-2" /> : null}
          </div>
        </div>

        <div className={cn(TWO_LINE_CELL_CLASS, "text-left leading-tight h-[40px]")}>
          <div className="truncate" title={memSummary}>
            {compactMemContent ? compactMemSummary : memSummary}
          </div>
          <div className="flex items-center h-2">
            {enableListItemProgressBar ? <ProgressBar value={memUsage} h="h-2" /> : null}
          </div>
        </div>

        <div className={cn(TWO_LINE_CELL_CLASS, "text-left leading-tight")}>
          <div className="truncate" title={diskSummary}>
            {compactDiskContent ? compactDiskSummary : diskSummary}
          </div>
          <div className="flex items-center h-2">
            {enableListItemProgressBar ? <ProgressBar value={diskUsage} h="h-2" /> : null}
          </div>
        </div>

        <div className={cn(TWO_LINE_CELL_CLASS, "text-left leading-tight h-[40px]")}>
          <div className="truncate">
            {stats ? (
              <span style={{ color: getNetworkSpeedColor(stats.net_out) }}>
                {`${t("node.uploadPrefix")} ${formatNetworkSpeedMbps(
                  stats.net_out
                )}`}
              </span>
            ) : (
              t("node.notAvailable")
            )}
          </div>
          <div className="truncate">
            {stats ? (
              <span style={{ color: getNetworkSpeedColor(stats.net_in) }}>
                {`${t("node.downloadPrefix")} ${formatNetworkSpeedMbps(
                  stats.net_in
                )}`}
              </span>
            ) : (
              t("node.notAvailable")
            )}
          </div>
        </div>

        <div className={cn(TWO_LINE_CELL_CLASS, "text-left leading-tight h-[40px]")}>
          <div className="truncate">
            {stats
              ? `${t("node.uploadPrefix")} ${formatBytes(stats.net_total_up)}`
              : t("node.notAvailable")}
          </div>
          <div className="truncate">
            {stats
              ? `${t("node.downloadPrefix")} ${formatBytes(stats.net_total_down)}`
              : t("node.notAvailable")}
          </div>
        </div>

        <div className={cn(TWO_LINE_CELL_CLASS, "text-left leading-tight h-[40px]")}>
          <div className="truncate" title={trafficQuotaSummary}>
            {compactQuotaContent ? compactTrafficQuotaSummary : trafficQuotaSummary}
          </div>
          <div className="flex items-center h-2">
            {hasTrafficLimit ? (
              <ProgressBar value={isOnline ? trafficPercentage : 0} h="h-2" />
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen
            ? "max-h-[1000px] opacity-100"
            : "max-h-0 opacity-0 overflow-hidden"
        }`}
        onTransitionEnd={() => {
          if (!isOpen) {
            setShouldRenderChart(false);
          }
        }}>
        <div
          className={cn(
            "grid gap-4 p-2",
            enablePingChart ? "grid-cols-3" : ""
          )}>
          {enableInstanceDetail && (
            <div className="col-span-1 @container">
              <Instance node={node} />
            </div>
          )}
          {enablePingChart && (
            <div className={enableInstanceDetail ? "col-span-2" : "col-span-3"}>
              {shouldRenderChart && (
                <PingChart node={node} initialHours={pingChartTimeInPreview} />
              )}
            </div>
          )}
          {!enableInstanceDetail && !enablePingChart && (
            <div className="flex items-center justify-center">
              <div className="text-lg">{t("homePage.noDetailsAvailable")}</div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
