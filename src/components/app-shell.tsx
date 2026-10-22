import { useEffect } from "react";
import { Outlet } from "@tanstack/react-router";
import { MobileNav, Sidebar } from "@/components/sidebar";
import { useLibraryStore } from "@/lib/anime/library-store";

export function AppShell() {
  useEffect(() => {
    void useLibraryStore.persist.rehydrate();
  }, []);

  return (
    <div className="flex h-[100dvh] flex-col bg-bg text-fg">
      <div className="flex min-h-0 flex-1 gap-2 p-2 max-md:p-0">
        <Sidebar />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-xl bg-surface max-md:rounded-none">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
