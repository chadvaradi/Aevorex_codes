import React, { useEffect } from "react";

export const LegacyAnalysisBubblesPortal = () => {
  useEffect(() => {
    const sectionId = "fh-analysis-bubbles";
    let section = document.getElementById(sectionId);
    if (!section) {
      // Create outer section with internal container div
      section = document.createElement("section");
      section.id = sectionId;
      section.className = "fh-analysis-bubbles";
      section.innerHTML = `<div id="analysis-bubbles-container"></div>`;
      // Append after chart section
      const chartSection = document.getElementById("chart-section");
      if (chartSection && chartSection.parentNode) {
        (chartSection.parentNode as HTMLElement).insertAdjacentElement("afterend", section);
      } else {
        document.body.appendChild(section);
      }
    }

    // Ensure inner container exists
    let inner = document.getElementById("analysis-bubbles-container");
    if (!inner) {
      inner = document.createElement("div");
      inner.id = "analysis-bubbles-container";
      section.appendChild(inner);
    }

    // Instantiate legacy AnalysisBubbles if not already present
    let bubblesInst: any = (window as any).__analysisBubbles;
    const LegacyCtor = (window as any).AnalysisBubbles;
    if (!bubblesInst && typeof LegacyCtor === "function") {
      try {
        bubblesInst = new LegacyCtor({
          apiClient: (window as any).FinanceHubAPI ?? (window as any).FinanceHubAPIService,
          containerId: sectionId,
        });
        (window as any).__analysisBubbles = bubblesInst;
      } catch (err) {
        console.error("LegacyAnalysisBubblesPortal: init error", err);
      }
    }

    return () => {
      if (bubblesInst && typeof bubblesInst.destroy === "function") {
        try { bubblesInst.destroy(); } catch {}
        (window as any).__analysisBubbles = null;
      }
    };
  }, []);

  return null;
}; 