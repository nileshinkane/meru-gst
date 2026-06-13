import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { AppNavbar } from "@/components/app-navbar";
import { AppSidebar } from "@/components/app-sidebar";
import { getPageTitle } from "@/lib/navigation";

export function AppLayout() {
  const location = useLocation();

  return (
    <main className="workspace-shell grid min-h-screen grid-cols-[240px_minmax(0,1fr)] bg-background text-foreground">
      <AppSidebar />

      <section className="min-w-0">
        <AppNavbar title={getPageTitle(location.pathname)} />

        <div className="p-5">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
