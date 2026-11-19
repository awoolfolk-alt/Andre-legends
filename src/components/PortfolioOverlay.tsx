"use client";

import { useEffect, useState } from "react";
import PortfolioView from "./PortfolioView";
import { PORTFOLIO_CLOSE_EVENT, PORTFOLIO_OPEN_EVENT } from "@/game/data/portfolio";

export default function PortfolioOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const showPortfolio = () => setOpen(true);
    window.addEventListener(PORTFOLIO_OPEN_EVENT, showPortfolio);
    return () => {
      window.removeEventListener(PORTFOLIO_OPEN_EVENT, showPortfolio);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePortfolio();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const closePortfolio = () => {
    setOpen(false);
    window.dispatchEvent(new Event(PORTFOLIO_CLOSE_EVENT));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#060b16]/95"
      role="dialog"
      aria-modal="true"
      aria-label="Andre Woolfolk portfolio"
    >
      <PortfolioView embedded onClose={closePortfolio} />
    </div>
  );
}
