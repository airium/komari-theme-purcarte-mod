import { Button } from "@/components/ui/button";
import { StatsBar } from "@/components/sections/StatsBar";
import {
  NodeTable,
  NODE_TABLE_MAX_WIDTH_REM,
} from "@/components/sections/NodeTable";
import Loading from "@/components/loading";
import type { NodeData } from "@/types/node";
import { useNodeData } from "@/contexts/NodeDataContext";
import { useAppConfig } from "@/config";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useIsMobile } from "@/hooks/useMobile";
import { useLocale } from "@/config/hooks";

interface HomePageProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredNodes: (NodeData & { stats?: any })[];
  selectedGroup: string;
  setSelectedGroup: (group: string) => void;
  stats: any;
  groups: string[];
  handleSort: (key: any) => void;
}

const HomePage: React.FC<HomePageProps> = ({
  searchTerm,
  setSearchTerm,
  filteredNodes,
  selectedGroup,
  setSelectedGroup,
  stats,
  groups,
  handleSort,
}) => {
  const { loading, error, refreshNodes } = useNodeData();
  const {
    enableStatsBar,
    enableListItemProgressBar,
    isShowStatsInHeader,
  } = useAppConfig();
  const { t } = useLocale();

  const isMobile = useIsMobile();

  const hasSearchTerm = searchTerm.trim().length > 0;

  if (loading) {
    return <Loading text={t("homePage.loadingData")} />;
  }

  return (
    <div className="fade-in my-4">
      {enableStatsBar && (!isShowStatsInHeader || isMobile) && (
        <StatsBar
          stats={stats}
          loading={loading}
          isShowStatsInHeader={isShowStatsInHeader}
          onSort={handleSort}
        />
      )}

      <div
        className="box-border w-full mx-auto px-1 my-4"
        style={{ maxWidth: `min(${NODE_TABLE_MAX_WIDTH_REM}rem, var(--main-width))` }}>
        <Card className="theme-card-style overflow-x-auto text-primary">
          <div className="flex min-w-max items-center gap-1 whitespace-nowrap px-1.5 py-1">
            <span className="shrink-0 text-xs text-secondary-foreground">
              {t("group.name")}
            </span>
            {groups?.map((group: string) => (
              <Button
                key={group}
                variant={selectedGroup === group ? "secondary" : "ghost"}
                size="sm"
                className="h-6 rounded-full px-1.5 text-[11px] font-medium"
                onClick={() => setSelectedGroup?.(group)}>
                {group}
              </Button>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-4 -mx-2 -mb-2">
        {filteredNodes.length > 0 ? (
          <NodeTable
            nodes={filteredNodes}
            enableListItemProgressBar={enableListItemProgressBar}
          />
        ) : (
          <div className="flex flex-grow items-center justify-center">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">
                  {hasSearchTerm
                    ? t("search.notFound")
                    : error
                    ? t("homePage.errorFetchingNodes")
                    : t("homePage.noNodes")}
                </CardTitle>
                <CardDescription>
                  {hasSearchTerm
                    ? t("search.tryChangingFilters")
                    : error
                    ? t("homePage.retryFetchingNodes")
                    : t("homePage.addNodesInAdmin")}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                {hasSearchTerm ? (
                  <Button onClick={() => setSearchTerm("")} className="w-full">
                    {t("search.clear")}
                  </Button>
                ) : error ? (
                  <Button
                    onClick={() => void refreshNodes()}
                    className="w-full">
                    {t("search.retry")}
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      window.open("/admin", "_blank", "noopener,noreferrer")
                    }
                    className="w-full">
                    {t("homePage.addNode")}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
