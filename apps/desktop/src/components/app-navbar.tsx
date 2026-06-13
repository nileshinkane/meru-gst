import { AppUpdateButton } from "@/components/app-update-button";
import { useAppUpdates } from "@/hooks/use-app-updates";

export function AppNavbar({ title }: { title: string }) {
  const { state: updateState, installUpdate } = useAppUpdates();

  return (
    <header className="appbar flex h-14 items-center justify-between border-b bg-background px-5">
      <div>
        <h1 className="text-base font-semibold">{title}</h1>
        <p className="text-xs text-muted-foreground">MERU GST desktop</p>
      </div>
      <div className="flex items-center gap-2">
        <AppUpdateButton
          updateState={updateState}
          installUpdate={installUpdate}
        />
      </div>
    </header>
  );
}
