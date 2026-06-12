import { Card, CardContent } from "@/components/ui/card";
import type { NodeData } from "@/types/node";
import {
  memo,
  useMemo,
  type ReactNode,
} from "react";
import {
  formatBytes,
  formatCpuCoreTopology,
  formatHardwareName,
  formatIsoDateTime,
  formatLoadValue,
  formatNetworkSpeedMbps,
  formatOfflineHours,
  formatPercentage,
  formatUptime,
  getTrafficLimitTypeLabel,
  getNetworkSpeedColor,
  getProgressBarColor,
  getUptimeHoursColor,
} from "@/utils";
import { useNodeCommons } from "@/hooks/useNodeCommons";
import { useLiveData } from "@/contexts/LiveDataContext";
import { useLocale } from "@/config/hooks";

interface DetailLine {
  label: string;
  value: ReactNode;
}

const LineValue = ({ children }: { children: ReactNode }) => (
  <div className="min-w-0 overflow-hidden text-primary">{children}</div>
);

const LineValueText = ({ value }: { value: string }) => (
  <span className="block min-w-0 truncate text-primary">
    {value}
  </span>
);

const PercentageValue = ({ value }: { value: number }) => (
  <span style={{ color: getProgressBarColor(value) }}>{formatPercentage(value)}</span>
);

const ProgressTint = ({
  value,
  children,
}: {
  value: number;
  children: ReactNode;
}) => <span style={{ color: getProgressBarColor(value) }}>{children}</span>;

const InlineSummary = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex max-w-full items-center gap-1.5 overflow-hidden whitespace-nowrap">
    {children}
  </span>
);

const FixedSummaryCell = ({ children }: { children: ReactNode }) => (
  <span className="inline-block w-[4.5rem] overflow-hidden truncate align-top">
    {children}
  </span>
);

const DetailLineRow = memo(({ label, value }: DetailLine) => (
  <>
    <span className="text-secondary-foreground whitespace-nowrap">
      {label}
    </span>
    {typeof value === "string" ? <LineValueText value={value} /> : <LineValue>{value}</LineValue>}
  </>
));

DetailLineRow.displayName = "DetailLineRow";

interface InstanceProps {
  node: NodeData;
}

const normalizeDetailText = (value?: string | null) => {
  if (value === null || value === undefined) return "-";

  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "none") {
    return "-";
  }

  return trimmed;
};

const Instance = memo(({ node }: InstanceProps) => {
  const { liveData } = useLiveData();
  const nodeWithStats = useMemo(
    () => ({
      ...node,
      stats: liveData?.[node.uuid],
    }),
    [node, liveData]
  );

  const { stats, isOnline } = useNodeCommons(nodeWithStats);
  const { t } = useLocale();

  const trafficUsed = useMemo(() => {
    if (!stats || !isOnline) return null;

    switch (node.traffic_limit_type) {
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
  }, [stats, isOnline, node.traffic_limit_type]);

  const trafficTypeText = getTrafficLimitTypeLabel(
    node.traffic_limit_type || "max",
    {
      sum: t("node.trafficTypeSum"),
      max: t("node.trafficTypeMax"),
      min: t("node.trafficTypeMin"),
      up: t("node.trafficTypeUp"),
      down: t("node.trafficTypeDown"),
    }
  );

  const memoryPercentage =
    stats && isOnline && node.mem_total > 0 ? (stats.ram / node.mem_total) * 100 : null;

  const swapPercentage =
    stats && isOnline && node.swap_total > 0 ? (stats.swap / node.swap_total) * 100 : null;

  const diskPercentage =
    stats && isOnline && node.disk_total > 0 ? (stats.disk / node.disk_total) * 100 : null;

  const trafficPercentage =
    node.traffic_limit && node.traffic_limit > 0 && stats && isOnline && trafficUsed !== null
      ? (trafficUsed / node.traffic_limit) * 100
      : null;

  const lastReportTime =
    stats && typeof stats === "object"
      ? ("time" in stats && typeof stats.time === "string" && stats.time) ||
      ("updated_at" in stats && typeof stats.updated_at === "string" && stats.updated_at) ||
      node.updated_at
      : node.updated_at;

  const offlineHours = formatOfflineHours(lastReportTime);
  const virtualizationText = normalizeDetailText(node.virtualization).toLocaleUpperCase();
  const cpuDisplayName = formatHardwareName(node.cpu_name);
  const gpuDisplayName = formatHardwareName(node.gpu_name);
  const systemSummary =
    virtualizationText === "-"
      ? `${normalizeDetailText(node.os)} | ${normalizeDetailText(node.arch).toLocaleUpperCase()}`
      : `${normalizeDetailText(node.os)} | ${normalizeDetailText(node.arch).toLocaleUpperCase()} | ${virtualizationText}`;
  const cpuModelSummary =
    cpuDisplayName === "-"
      ? cpuDisplayName
      : `${cpuDisplayName} (${formatCpuCoreTopology(node.cpu_cores, node.cpu_physical_cores)})`;

  const cpuSummary = stats && isOnline
    ? (
      <div className="min-w-0 overflow-hidden">
        <div className="truncate">{cpuModelSummary}</div>
        <InlineSummary>
          <span className="shrink-0">
            <PercentageValue value={stats.cpu} />
          </span>
          <span className="shrink-0">|</span>
          <span className="truncate">{`${formatLoadValue(stats.load)} / ${formatLoadValue(stats.load5)} / ${formatLoadValue(stats.load15)}`}</span>
        </InlineSummary>
      </div>
    )
    : cpuModelSummary;

  const memorySummary = stats && isOnline
    ? (
      <InlineSummary>
        {memoryPercentage !== null ? (
          <ProgressTint value={memoryPercentage}>
            <span className="truncate">{`${formatBytes(stats.ram)} / ${formatBytes(node.mem_total)}`}</span>
            <span className="shrink-0"> (<PercentageValue value={memoryPercentage} />)</span>
          </ProgressTint>
        ) : (
          <span className="truncate">{`${formatBytes(stats.ram)} / ${formatBytes(node.mem_total)}`}</span>
        )}
      </InlineSummary>
    )
    : formatBytes(node.mem_total);

  const swapSummary = stats && isOnline
    ? (
      <InlineSummary>
        {node.swap_total <= 0 ? (
          <span className="truncate">-</span>
        ) : swapPercentage !== null ? (
          <ProgressTint value={swapPercentage}>
            <span className="truncate">{`${formatBytes(stats.swap)} / ${formatBytes(node.swap_total)
              }`}</span>
            <span className="shrink-0"> (<PercentageValue value={swapPercentage} />)</span>
          </ProgressTint>
        ) : (
          <span className="truncate">{`${formatBytes(stats.swap)} / ${formatBytes(node.swap_total)}`}</span>
        )}
      </InlineSummary>
    )
    : node.swap_total > 0
      ? formatBytes(node.swap_total)
      : "-";

  const diskSummary = stats && isOnline
    ? (
      <InlineSummary>
        {diskPercentage !== null ? (
          <ProgressTint value={diskPercentage}>
            <span className="truncate">{`${formatBytes(stats.disk)} / ${formatBytes(node.disk_total)}`}</span>
            <span className="shrink-0"> (<PercentageValue value={diskPercentage} />)</span>
          </ProgressTint>
        ) : (
          <span className="truncate">{`${formatBytes(stats.disk)} / ${formatBytes(node.disk_total)}`}</span>
        )}
      </InlineSummary>
    )
    : formatBytes(node.disk_total);

  const speedLine = stats && isOnline
    ? (
      <InlineSummary>
        <FixedSummaryCell>
          <span style={{ color: getNetworkSpeedColor(stats.net_out) }}>
            {`${t("node.uploadPrefix")} ${formatNetworkSpeedMbps(stats.net_out)}`}
          </span>
        </FixedSummaryCell>
        <FixedSummaryCell>
          <span style={{ color: getNetworkSpeedColor(stats.net_in) }}>
            {`${t("node.downloadPrefix")} ${formatNetworkSpeedMbps(stats.net_in)}`}
          </span>
        </FixedSummaryCell>
      </InlineSummary>
    )
    : t("node.notAvailable");

  const trafficLine = stats && isOnline
    ? (
      <InlineSummary>
        <FixedSummaryCell>
          {`${t("node.uploadPrefix")} ${formatBytes(stats.net_total_up)}`}
        </FixedSummaryCell>
        <FixedSummaryCell>
          {`${t("node.downloadPrefix")} ${formatBytes(stats.net_total_down)}`}
        </FixedSummaryCell>
      </InlineSummary>
    )
    : t("node.notAvailable");

  const quotaSummary =
    node.traffic_limit === 0
      ? "∞"
      : node.traffic_limit === undefined
        ? t("node.notSet")
        : (
          <InlineSummary>
            {trafficPercentage !== null ? (
              <ProgressTint value={trafficPercentage}>
                <span className="truncate">
                  {`${stats && isOnline && trafficUsed !== null ? formatBytes(trafficUsed) : t("node.notAvailable")} / ${formatBytes(node.traffic_limit)} ${trafficTypeText}`}
                </span>
                <span className="shrink-0"> (<PercentageValue value={trafficPercentage} />)</span>
              </ProgressTint>
            ) : (
              <span className="truncate">
                {`${stats && isOnline && trafficUsed !== null ? formatBytes(trafficUsed) : t("node.notAvailable")} / ${formatBytes(node.traffic_limit)} ${trafficTypeText}`}
              </span>
            )}
          </InlineSummary>
        );

  const statusLine = stats ? (
    <InlineSummary>
      <span className={isOnline ? "text-white" : "text-red-500"}>
        {isOnline ? "ONLINE" : "OFFLINE"}
      </span>
      {isOnline ? (
        <span style={{ color: getUptimeHoursColor(stats.uptime / 3600) }}>
          {`${formatUptime(stats.uptime)} hr`}
        </span>
      ) : (
        <span className="text-red-500">{`${offlineHours} hr`}</span>
      )}
      <span className="text-secondary-foreground">{isOnline ? "by" : "since"}</span>
      <span className="truncate text-primary">
        {formatIsoDateTime(lastReportTime, true, t("node.notAvailable"))}
      </span>
    </InlineSummary>
  ) : (
    t("node.notAvailable")
  );

  const detailLines: DetailLine[] = [
    {
      label: t("instancePage.sys"),
      value: systemSummary,
    },
    {
      label: t("instancePage.cpu"),
      value: cpuSummary,
    },
    {
      label: t("instancePage.gpu"),
      value: gpuDisplayName,
    },
    {
      label: t("instancePage.mem"),
      value: memorySummary,
    },
    {
      label: t("instancePage.swap"),
      value: swapSummary,
    },
    {
      label: t("instancePage.disk"),
      value: diskSummary,
    },
    {
      label: t("instancePage.speed"),
      value: speedLine,
    },
    {
      label: t("instancePage.traffic"),
      value: trafficLine,
    },
    {
      label: t("instancePage.quota"),
      value: quotaSummary,
    },
    {
      label: t("instancePage.status"),
      value: statusLine,
    },
  ];

  return (
    <Card className="h-full overflow-hidden">
      <CardContent className="p-3">
        <div className="bg-black/35 px-1 py-0.5">
          <div className="text-[0.75rem] leading-4.5 md:text-[0.8rem]">
            <div className="grid grid-cols-[max-content_minmax(0,1fr)] items-start gap-x-2 gap-y-0.5">
              {detailLines.map((line) => (
                <DetailLineRow key={line.label} label={line.label} value={line.value} />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default Instance;
