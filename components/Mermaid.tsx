import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface MermaidProps {
  chart: string;
  onExportReady?: (svg: string) => void; // Added for export
}

const Mermaid: React.FC<MermaidProps> = ({ chart, onExportReady }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      mermaid.initialize({ startOnLoad: false });
      mermaid
        .render("mermaid-diagram", chart)
        .then(({ svg }) => {
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
          if (onExportReady) {
            onExportReady(svg);
          }
        });
    }
  }, [chart, onExportReady]);

  return <div ref={ref} />;
};

export default Mermaid;