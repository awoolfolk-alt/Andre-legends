import PortfolioView from "@/components/PortfolioView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Andre Woolfolk | Portfolio",
  description: "Andre's story, projects, and journey toward a career in cybersecurity.",
};

export default function PortfolioPage() {
  return <PortfolioView />;
}
