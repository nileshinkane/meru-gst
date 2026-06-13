import { lazy } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppErrorBoundary } from "@/components/app-error-boundary";
import { AppLayout } from "@/components/app-layout";
import { LightModeEnforcer } from "@/components/light-mode-enforcer";
import { Toaster } from "@/components/sonner";

const HomePage = lazy(() =>
  import("@/pages/home-page").then((module) => ({
    default: module.HomePage,
  })),
);
const CustomersPage = lazy(() =>
  import("@/pages/master-data-pages").then((module) => ({
    default: module.CustomersPage,
  })),
);
const InvoicesPage = lazy(() =>
  import("@/pages/invoices-page").then((module) => ({
    default: module.InvoicesPage,
  })),
);
const InvoiceCreatePage = lazy(() =>
  import("@/pages/invoice-create-page").then((module) => ({
    default: module.InvoiceCreatePage,
  })),
);
const MedicinesPage = lazy(() =>
  import("@/pages/master-data-pages").then((module) => ({
    default: module.MedicinesPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/pages/settings-page").then((module) => ({
    default: module.SettingsPage,
  })),
);

function App() {
  return (
    <AppErrorBoundary>
      <HashRouter>
        <LightModeEnforcer />
        <Toaster />
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="invoices/new" element={<InvoiceCreatePage />} />
            <Route path="medicines" element={<MedicinesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppErrorBoundary>
  );
}

export default App;
