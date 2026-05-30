import { useState, useEffect, createContext, useContext } from "react";
import { useAppConfig } from "@/config";
import { DEFAULT_CONFIG } from "@/config/default";
import type { ColorType } from "@/config/default";

export interface ThemeContextType {
  color: ColorType;
  setColor: (color: ColorType) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  color: DEFAULT_CONFIG.selectThemeColor as ColorType,
  setColor: () => {},
});

export const useThemeManager = () => {
  const { selectThemeColor } = useAppConfig();

  const [color, setColor] = useState<ColorType>(selectThemeColor);

  useEffect(() => {
    setColor(selectThemeColor);
  }, [selectThemeColor, setColor]);

  return {
    color,
    setColor,
  };
};
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
