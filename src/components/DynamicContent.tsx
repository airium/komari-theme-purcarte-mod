import { type ReactNode, useCallback, useMemo, useEffect } from "react";
import { useAppConfig } from "@/config/hooks";
import { useIsMobile } from "@/hooks/useMobile";

export function DynamicContent({ children }: { children: ReactNode }) {
  const config = useAppConfig();
  const isMobile = useIsMobile();
  const getUrlFromConfig = useCallback(
    (urls: string) => {
      if (!urls) return "";
      const urlList = urls
        .split("|")
        .map((u) => u.trim())
        .filter(Boolean);
      if (urlList.length > 1) {
        return urlList[urlList.length - 1];
      }
      return urlList[0] || "";
    },
    []
  );

  const imageUrl = useMemo(() => {
    if (!config) return "";
    const { backgroundImage, backgroundImageMobile } = config;
    return isMobile && backgroundImageMobile
      ? getUrlFromConfig(backgroundImageMobile)
      : getUrlFromConfig(backgroundImage);
  }, [config, isMobile, getUrlFromConfig]);

  const videoUrl = useMemo(() => {
    if (!config || !config.enableVideoBackground) return "";
    const { videoBackgroundUrl, videoBackgroundUrlMobile } = config;
    return isMobile && videoBackgroundUrlMobile
      ? getUrlFromConfig(videoBackgroundUrlMobile)
      : getUrlFromConfig(videoBackgroundUrl);
  }, [config, isMobile, getUrlFromConfig]);

  const dynamicStyles = useMemo(() => {
    if (!config) return "";
    const { mainWidth, blurValue, blurBackgroundColor } = config;
    const styles: string[] = [];

    styles.push(`--main-width: ${mainWidth}vw;`);
    styles.push(`--body-background-url: url(${imageUrl});`);
    styles.push(`--purcarte-blur: ${blurValue}px;`);

    const colors = blurBackgroundColor
      .split("|")
      .map((color) => color.trim())
      .filter(Boolean);
    const darkColor =
      colors.length > 1 ? colors[colors.length - 1] : colors[0];
    if (darkColor) {
      styles.push(`--card-light: ${darkColor};`);
      styles.push(`--card-dark: ${darkColor};`);
    }

    return `:root { ${styles.join(" ")} }`;
  }, [config, imageUrl]);

  useEffect(() => {
    const imageBackground = document.getElementById("image-background");
    const videoBackground = document.getElementById(
      "video-background"
    ) as HTMLVideoElement;
    const [size, position] = config.backgroundAlignment
      .split(",")
      .map((s) => s.trim());

    if (imageBackground) {
      imageBackground.style.backgroundImage = `url(${imageUrl})`;
      imageBackground.style.backgroundSize = size;
      imageBackground.style.backgroundPosition = position;
    }

    if (videoBackground) {
      if (config.enableVideoBackground && videoUrl) {
        videoBackground.src = videoUrl;
        videoBackground.style.objectFit = size;
        videoBackground.style.objectPosition = position;
        videoBackground.style.display = "block";
      } else {
        videoBackground.style.display = "none";
      }
    }
  }, [
    imageUrl,
    videoUrl,
    config.backgroundAlignment,
    config.enableVideoBackground,
  ]);

  return (
    <>
      <style>{dynamicStyles}</style>
      <div className="fade-in">{children}</div>
    </>
  );
}
