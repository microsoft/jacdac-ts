import { PaletteType } from "@material-ui/core";
import { useEffect, useState } from "react";

export default function useDarkMode(): {
  darkMode: PaletteType,
  toggleDarkMode: () => void,
  darkModeMounted: boolean
} {
  const KEY = 'darkMode'
  const [darkMode, setDarkMode] = useState<PaletteType>('light');
  const [darkModeMounted, setMounted] = useState(false);

  const setMode = (mode: PaletteType) => {
    if (typeof window !== "undefined")
      window.localStorage.setItem(KEY, mode)
    setDarkMode(mode)
  }
  const toggleDarkMode = () => {
    if (darkMode === 'light') {
      console.log(`toggle dark`)
      setMode('dark')
    } else {
      console.log(`toggle light`)
      setMode('light')
    }
  };

  useEffect(() => {
    const localTheme = typeof window !== "undefined" && window.localStorage.getItem(KEY) as PaletteType;
    if (localTheme) {
      setDarkMode(localTheme || 'light');
    } else if (typeof window !== "undefined" && window?.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode('dark')
    } else {
      setDarkMode('light')
    }
    setMounted(true);
  }, []);

  return { darkMode, toggleDarkMode, darkModeMounted }
}