import { useState, useEffect } from "react";

const SVG_PATH = new URL("../../imports/rpk2.svg", import.meta.url).href;

interface RpkLogoProps {
  className?: string;
  style?: React.CSSProperties;
}

export function RpkLogo({ className, style }: RpkLogoProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);

  useEffect(() => {
    fetch(SVG_PATH)
      .then((res) => res.text())
      .then((text) => {
        // Inject className-friendly attributes into the SVG root element
        const processed = text.replace(
          /^<svg /,
          '<svg style="width:100%;height:100%;display:block" '
        );
        setSvgContent(processed);
      })
      .catch((err) => console.error("Failed to load RPK logo SVG:", err));
  }, []);

  if (!svgContent) return null;

  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
