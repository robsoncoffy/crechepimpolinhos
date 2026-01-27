import { Suspense, lazy } from "react";
import { Header } from "./Header";

const LazyFooter = lazy(() => import("./Footer").then(m => ({ default: m.Footer })));

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Suspense fallback={<div className="h-64 bg-primary" />}>
        <LazyFooter />
      </Suspense>
    </div>
  );
}
