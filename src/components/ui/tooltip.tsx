import { useCallback } from "react";
import { formatIsoDateTime } from "@/utils";

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: any;
  chartConfig?: any;
  labelFormatter?: (label: any) => string;
  renderValue?: (value: any, item: any) => any;
  getValueClassName?: (value: any, item: any) => string | undefined;
}

export const CustomTooltip = ({
  active,
  payload,
  label,
  chartConfig,
  labelFormatter,
  renderValue,
  getValueClassName,
}: CustomTooltipProps) => {
  const defaultLabelFormatter = useCallback(
    (value: any) => formatIsoDateTime(value, true, "-"),
    []
  );

  if (active && payload && payload.length) {
    return (
      <div className="purcarte-blur p-3 theme-card-style w-max max-w-[90vw]">
        <p className="text-xs font-medium text-secondary-foreground mb-2">
          {labelFormatter
            ? labelFormatter(label)
            : defaultLabelFormatter(label)}
        </p>
        <div
          className="grid gap-x-6 gap-y-1 auto-cols-max"
          style={{
            gridAutoFlow: "column",
            gridTemplateRows: "repeat(14, minmax(0, auto))",
          }}>
          {payload.map((item: any, index: number) => {
            const series = chartConfig?.series
              ? chartConfig.series.find((s: any) => s.dataKey === item.dataKey)
              : {
                  dataKey: chartConfig?.dataKey || item.dataKey,
                  tooltipLabel: chartConfig?.tooltipLabel || item.name,
                  tooltipFormatter: chartConfig?.tooltipFormatter,
                };

            let value = item.value;
            if (series?.tooltipFormatter) {
              value = series.tooltipFormatter(value, item.payload);
            } else if (typeof value === "number") {
              value = `${value.toFixed(0)}`;
            } else {
              value = value?.toString() || "-";
            }

            const customValue = renderValue
              ? renderValue(item.value, item)
              : undefined;
            const valueClassName = getValueClassName
              ? getValueClassName(item.value, item)
              : undefined;
            const displayValue =
              customValue === undefined ? value : customValue;

            return (
              <div
                key={`${item.dataKey}-${index}`}
                className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {series?.tooltipLabel || item.name || item.dataKey}:
                  </span>
                </div>
                <span
                  className={`text-sm font-bold ml-2 ${valueClassName || ""}`}>
                  {displayValue}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};
