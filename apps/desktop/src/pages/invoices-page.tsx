import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@meru/ui/components/button";

export function InvoicesPage() {
  const navigate = useNavigate();

  return (
    <section className="min-h-[calc(100vh-96px)] rounded-lg border border-dashed bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Invoices</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Workspace coming next.
          </p>
        </div>
        <Button onClick={() => navigate("/invoices/new")}>
          <Plus aria-hidden="true" />
          Create new invoice
        </Button>
      </div>
    </section>
  );
}
