import {
  StrictMode,
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
  type CSSProperties,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import "@radix-ui/themes/styles.css";
import "./index.css";
import { Theme } from "@radix-ui/themes";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Header } from "@/components/sections/Header";
import { ConfigProvider, useAppConfig } from "@/config";
import { DynamicContent } from "@/components/DynamicContent";
import { useThemeManager, useTheme } from "@/hooks/useTheme";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NodeDataProvider } from "@/contexts/NodeDataContext";
import { LiveDataProvider } from "@/contexts/LiveDataContext";
import Footer from "@/components/sections/Footer";
import Loading from "./components/loading";
import type { StatsBarProps } from "./components/sections/StatsBar";
import { useNodeListCommons } from "@/hooks/useNodeCommons";
import SettingsPanel from "./components/settings/SettingsPanel";
import { useIsMobile } from "./hooks/useMobile";
import type { SiteStatus } from "./config/default";
import { Toaster } from "@/components/ui/sonner";
const HomePage = lazy(() => import("@/pages/Home"));
const InstancePage = lazy(() => import("@/pages/instance"));
const NotFoundPage = lazy(() => import("@/pages/NotFound"));
const PrivatePage = lazy(() => import("@/pages/Private"));

const homeScrollState = {
  position: 0,
};

const AppRoutes = ({
  searchTerm,
  setSearchTerm,
  isSettingsOpen,
  setIsSettingsOpen,
  headerRef,
  headerHeight,
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (isOpen: boolean) => void;
  headerRef: React.RefObject<HTMLElement | null>;
  headerHeight: number;
}) => {
  const location = useLocation();
  const {
    loading,
    groups,
    filteredNodes,
    stats,
    selectedGroup,
    setSelectedGroup,
  } = useNodeListCommons(searchTerm);
  const statsBarProps: StatsBarProps = {
    stats,
    loading,
  };

  const homeViewportRef = useRef<HTMLDivElement | null>(null);
  const instanceViewportRef = useRef<HTMLDivElement | null>(null);

  const handleHomeScroll = () => {
    if (location.pathname === "/" && homeViewportRef.current) {
      homeScrollState.position = homeViewportRef.current.scrollTop;
    }
  };

  useEffect(() => {
    if (location.pathname === "/") {
      const timer = setTimeout(() => {
        if (homeViewportRef.current) {
          homeViewportRef.current.scrollTop = homeScrollState.position;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!location.pathname.startsWith("/instance")) return;
    const frame = requestAnimationFrame(() => {
      instanceViewportRef.current?.scrollTo({ top: 0 });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  return (
    <>
      <Header
        ref={headerRef}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setIsSettingsOpen={setIsSettingsOpen}
        isSettingsOpen={isSettingsOpen}
        {...statsBarProps}
      />
      <div className="flex-1 min-h-0">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route
              path="/"
              element={
                <ScrollArea
                  className="h-full"
                  viewportRef={homeViewportRef}
                  viewportProps={{ onScroll: handleHomeScroll }}>
                  <div className="flex flex-col min-h-screen">
                    <main
                      className="w-(--main-width) mx-auto h-full flex-grow"
                      style={{
                        paddingTop: headerHeight,
                      }}>
                      <HomePage
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        filteredNodes={filteredNodes}
                        selectedGroup={selectedGroup}
                        setSelectedGroup={setSelectedGroup}
                        groups={groups}
                      />
                    </main>
                    <Footer isSettingsOpen={isSettingsOpen} ref={null} />
                  </div>
                </ScrollArea>
              }
            />
            <Route
              path="/instance/:uuid"
              element={
                <ScrollArea
                  className="h-full"
                  viewportRef={instanceViewportRef}>
                  <div className="flex flex-col min-h-screen">
                    <main
                      className="w-(--main-width) h-full mx-auto flex-1"
                      style={{
                        paddingTop: headerHeight,
                      }}>
                      <InstancePage />
                    </main>
                    <Footer isSettingsOpen={isSettingsOpen} ref={null} />
                  </div>
                </ScrollArea>
              }
            />
            <Route
              path="*"
              element={
                <div className="flex flex-col min-h-screen">
                  <main className="w-(--main-width) h-full mx-auto flex-1">
                    <NotFoundPage />
                  </main>
                  <Footer isSettingsOpen={isSettingsOpen} ref={null} />
                </div>
              }
            />
          </Routes>
        </Suspense>
      </div>
    </>
  );
};

export const AppContent = () => {
  const { siteStatus, mainWidth } = useAppConfig();
  const { color } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isMobile = useIsMobile();
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const resizeObserver = new ResizeObserver(() => {
      setHeaderHeight(header.offsetHeight);
    });

    resizeObserver.observe(header);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isSettingsOpen && !isMobile) {
      document.documentElement.style.setProperty(
        "--main-width",
        `calc(${mainWidth}vw - var(--setting-width))`
      );
    } else {
      document.documentElement.style.setProperty(
        "--main-width",
        `${mainWidth}vw`
      );
    }
  }, [isSettingsOpen, isMobile, mainWidth]);

  const themeStyle: CSSProperties = {
    backgroundColor: "transparent",
    "--default-font-family": "var(--purcarte-font-sans)",
    "--heading-font-family": "var(--purcarte-font-sans)",
    "--strong-font-family": "var(--purcarte-font-sans)",
    "--em-font-family": "var(--purcarte-font-sans)",
    "--quote-font-family": "var(--purcarte-font-sans)",
    "--default-mono-font-family": "var(--purcarte-font-mono)",
    "--code-font-family": "var(--purcarte-font-mono)",
  } as CSSProperties;

  return (
    <Theme
      appearance="dark"
      accentColor={color}
      scaling="110%"
      style={themeStyle}>
      <Toaster />
      <DynamicContent>
        <div
          className={`grid h-dvh transition-all duration-300 ${
            isSettingsOpen && !isMobile
              ? "grid-cols-[1fr_auto]"
              : "grid-cols-[1fr]"
          } overflow-hidden`}>
          <div className="flex flex-col text-sm flex-1 overflow-hidden">
            {siteStatus === "private-unauthenticated" ? (
              <>
                <Header
                  isPrivate={true}
                  setIsSettingsOpen={setIsSettingsOpen}
                />
                <Suspense fallback={<Loading />}>
                  <div className="flex flex-col min-h-screen">
                    <main className="w-(--main-width) h-full mx-auto flex-1">
                      <PrivatePage />
                    </main>
                    <Footer isSettingsOpen={isSettingsOpen} ref={null} />
                  </div>
                </Suspense>
              </>
            ) : (
              <AppRoutes
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                isSettingsOpen={isSettingsOpen}
                setIsSettingsOpen={setIsSettingsOpen}
                headerRef={headerRef}
                headerHeight={headerHeight}
              />
            )}
          </div>
          <SettingsPanel
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        </div>
      </DynamicContent>
    </Theme>
  );
};

const AppProviders = ({
  siteStatus,
  children,
}: {
  siteStatus: SiteStatus;
  children: React.ReactNode;
}) => {
  if (siteStatus === "private-unauthenticated") {
    return <>{children}</>;
  }
  return (
    <NodeDataProvider>
      <LiveDataProvider>{children}</LiveDataProvider>
    </NodeDataProvider>
  );
};

const App = () => {
  const themeManager = useThemeManager();
  const { siteStatus } = useAppConfig();

  return (
    <ThemeProvider value={themeManager}>
      <AppProviders siteStatus={siteStatus}>
        <AppContent />
      </AppProviders>
    </ThemeProvider>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider>
      <Router>
        <App />
      </Router>
    </ConfigProvider>
  </StrictMode>
);
