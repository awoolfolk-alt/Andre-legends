// The mock review section shares one stylesheet (see mock.css for why).
import "./mock.css";

export const metadata = {
  title: "First-Person Redesign — Mocks | The Legend of Andre",
  description: "Design mocks of the first-person rebuild, for review before implementation.",
};

export default function MockLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
