import { DesktopHeader } from "./DesktopHeader";
import { MobileTabBar } from "./MobileTabBar";

/**
 * Shared shell (T025): desktop header from 768px up, bottom tab bar below it (FR-044).
 * Pages fill the remaining height; mobile pages leave room for the 88px tab bar.
 */
export function AppShell({ children, hideTabBar = false }: { children: React.ReactNode; hideTabBar?: boolean }) {
  return (
    <div className="flex h-dvh flex-col bg-app-mobile md:bg-app">
      <div className="hidden md:block">
        <DesktopHeader />
      </div>
      <main className={`relative flex min-h-0 flex-1 flex-col ${hideTabBar ? "" : "pb-[88px] md:pb-0"}`}>
        {children}
      </main>
      {!hideTabBar && (
        <div className="md:hidden">
          <MobileTabBar />
        </div>
      )}
    </div>
  );
}
