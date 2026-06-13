import { Database, FileText } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import { Button } from "@meru/ui/components/button";

import { navItems } from "@/lib/navigation";

export function AppSidebar() {
  return (
    <aside className="app-sidebar sticky top-0 h-screen self-start overflow-y-auto border-r bg-muted/30 px-4 py-5">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Database className="size-4" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-none">MERU GST</h1>
        </div>
      </div>

      <nav className="mt-8 grid gap-1 text-sm">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end
            className={({ isActive }) =>
              isActive
                ? "flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-left text-primary-foreground"
                : "flex h-9 items-center gap-2 rounded-md px-3 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            }
          >
            <span className="[&_svg]:size-4">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 rounded-md border bg-background p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <FileText className="size-4" aria-hidden="true" />
          Invoices
        </div>
        <Button asChild className="mt-3 w-full" size="sm">
          <Link to="/invoices/new">Create Invoice</Link>
        </Button>
      </div>
    </aside>
  );
}
