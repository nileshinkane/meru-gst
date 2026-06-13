import { FileText, Home, Pill, Settings, Users } from "lucide-react";
import type { ReactNode } from "react";

export type AppRouteId =
  | "home"
  | "customers"
  | "invoices"
  | "invoice-create"
  | "medicines"
  | "settings";

export type AppNavItem = {
  id: AppRouteId;
  label: string;
  title: string;
  path: string;
  icon: ReactNode;
};

export const navItems: AppNavItem[] = [
  {
    id: "home",
    label: "Home",
    title: "Home",
    path: "/",
    icon: <Home aria-hidden="true" />,
  },
  {
    id: "customers",
    label: "Customers",
    title: "Customers",
    path: "/customers",
    icon: <Users aria-hidden="true" />,
  },
  {
    id: "invoices",
    label: "Invoices",
    title: "Invoices",
    path: "/invoices",
    icon: <FileText aria-hidden="true" />,
  },
  {
    id: "medicines",
    label: "Medicines",
    title: "Medicines",
    path: "/medicines",
    icon: <Pill aria-hidden="true" />,
  },
  {
    id: "settings",
    label: "Settings",
    title: "Settings",
    path: "/settings",
    icon: <Settings aria-hidden="true" />,
  },
];

const pageTitles: Record<string, string> = {
  "/": "Home",
  "/customers": "Customers",
  "/invoices": "Invoices",
  "/invoices/new": "Create Invoice",
  "/medicines": "Medicines",
  "/settings": "Settings",
};

export function getPageTitle(pathname: string) {
  return pageTitles[pathname] ?? "Home";
}
