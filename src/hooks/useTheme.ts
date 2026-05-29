import { useState, useEffect, createContext, useContext } from "react";
import { useAppConfig } from "@/config";
import { DEFAULT_CONFIG } from "@/config/default";
import type { ColorType } from "@/config/default";

export interface ThemeContextType {
  color: ColorType;
  setColor: (color: ColorType) => void;
  statusCardsVisibility: {
    currentTime: boolean;
    currentOnline: boolean;
    regionOverview: boolean;
    trafficOverview: boolean;
    networkSpeed: boolean;
  };
  setStatusCardsVisibility: (
    visibility: Partial<ThemeContextType["statusCardsVisibility"]>
  ) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  color: DEFAULT_CONFIG.selectThemeColor as ColorType,
  setColor: () => {},
  statusCardsVisibility: {
    currentTime: true,
    currentOnline: true,
    regionOverview: true,
    trafficOverview: true,
    networkSpeed: true,
  },
  setStatusCardsVisibility: () => {},
});

const useStoredState = <T>(
  key: string,
  defaultValue: T,
  validator?: (value: any) => value is T
): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const { enableLocalStorage } = useAppConfig();

  const [state, setState] = useState<T>(() => {
    if (enableLocalStorage) {
      try {
        const storedValue = localStorage.getItem(key);
        if (storedValue) {
          const parsedValue = JSON.parse(storedValue);
          if (!validator || validator(parsedValue)) {
            return parsedValue as T;
          }
        }
      } catch (error) {
        console.error("Error parsing stored state:", error);
        // Fallback to default value if parsing fails
      }
    }
    return defaultValue;
  });

  useEffect(() => {
    if (enableLocalStorage) {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.error("Error setting stored state:", error);
      }
    }
  }, [key, state, enableLocalStorage]);

  return [state, setState];
};

export const useThemeManager = () => {
  const { selectThemeColor } = useAppConfig();
  const defaultstatusCardsVisibility = useAppConfig().statusCardsVisibility;

  const [color, setColor] = useStoredState<ColorType>(
    "color",
    selectThemeColor
  );

  const [statusCardsVisibility, setStatusCardsVisibility] = useStoredState(
    "statusCardsVisibility",
    (() => {
      const visibility: { [key: string]: boolean } = {};
      defaultstatusCardsVisibility.split(",").forEach((item) => {
        const [key, value] = item.split(":");
        visibility[key] = value === "true";
      });
      return visibility as ThemeContextType["statusCardsVisibility"];
    })()
  );

  const handleSetStatusCardsVisibility = (
    newVisibility: Partial<ThemeContextType["statusCardsVisibility"]>
  ) => {
    setStatusCardsVisibility((prev) => ({ ...prev, ...newVisibility }));
  };

  useEffect(() => {
    setColor(selectThemeColor);
  }, [selectThemeColor, setColor]);

  return {
    color,
    setColor,
    statusCardsVisibility,
    setStatusCardsVisibility: handleSetStatusCardsVisibility,
  };
};
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
