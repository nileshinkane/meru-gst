import { ArrowRight, FilePlus2, ReceiptText, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { canUseTauriDatabase, getCurrentOrgProfile } from "@/lib/database";

type Greeting = {
  title: string;
  subtitle: string;
};

export function HomePage() {
  const [clock, setClock] = useState(() => new Date());
  const [ownerName, setOwnerName] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!canUseTauriDatabase()) return;

    let cancelled = false;

    getCurrentOrgProfile()
      .then((profile) => {
        if (cancelled) return;
        setOwnerName(
          [profile.org_owner_first_name, profile.org_owner_last_name]
            .filter(Boolean)
            .join(" "),
        );
      })
      .catch(() => {
        if (!cancelled) setOwnerName("");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = useMemo(
    () => createGreeting(clock.getHours(), ownerName),
    [clock, ownerName],
  );
  const timeLabel = clock.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="home-page min-h-[calc(100vh-96px)] space-y-5">
      <header className="relative overflow-hidden rounded-lg border bg-gradient-to-br from-card via-secondary/30 to-background p-6 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-chart-3" />
        <div className="relative max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            {timeLabel}
          </div>
          <h2 className="text-3xl font-semibold tracking-normal text-foreground">
            {greeting.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {greeting.subtitle}
          </p>
        </div>
      </header>

      <Link
        to="/invoices/new"
        className="group relative block min-h-[240px] overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-br from-card via-secondary/40 to-accent/20 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-accent/25 via-primary/10 to-transparent sm:block" />
        <div className="absolute right-8 top-7 hidden text-primary/15 sm:block">
          <ReceiptText className="size-36" aria-hidden="true" />
        </div>
        <div className="absolute bottom-8 right-10 hidden w-48 rotate-[-6deg] space-y-3 sm:block">
          <div className="h-2 rounded-full bg-primary/20" />
          <div className="h-2 w-4/5 rounded-full bg-accent/30" />
          <div className="h-2 w-3/5 rounded-full bg-chart-3/25" />
        </div>

        <div className="relative flex min-h-[188px] max-w-xl flex-col justify-between">
          <div>
            <div className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <FilePlus2 className="size-6" aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-2xl font-semibold tracking-normal text-foreground">
              Create Invoice
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Start a new GST invoice with customer, medicine, batch, tax, and
              print details in one flow.
            </p>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            Open invoice creator
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </div>
        </div>
      </Link>
    </section>
  );
}

function createGreeting(hour: number, ownerName: string): Greeting {
  const name = ownerName.trim() || "there";

  if (hour >= 5 && hour < 10) {
    return {
      title: `Good morning, ${name}`,
      subtitle:
        "A clean start for billing, collections, and the first orders of the day.",
    };
  }

  if (hour >= 10 && hour < 14) {
    return {
      title: `Hope the day is moving well, ${name}`,
      subtitle:
        "Keep invoices, customers, and stock moving while the counter is active.",
    };
  }

  if (hour >= 14 && hour < 17) {
    return {
      title: `Good afternoon, ${name}`,
      subtitle:
        "A steady window to close pending bills and keep GST details tidy.",
    };
  }

  if (hour >= 17 && hour < 21) {
    return {
      title: `Good evening, ${name}`,
      subtitle:
        "Wrap up today's invoices with clean totals and fewer loose ends.",
    };
  }

  return {
    title: `Working late, ${name}`,
    subtitle:
      "Finish the urgent bill, keep the records organized, and leave the rest ready.",
  };
}
