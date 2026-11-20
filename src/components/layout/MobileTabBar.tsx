"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";

const tabs: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: "/", label: "Map", icon: "map", match: (p) => p === "/" },
  { href: "/incidents", label: "Incidents", icon: "list", match: (p) => p.startsWith("/incidents") },
  { href: "/facilities", label: "Facilities", icon: "home", match: (p) => p.startsWith("/facilities") },
  { href: "/profile", label: "Profile", icon: "user", match: (p) => p.startsWith("/profile") },
];

/** Mobile bottom tab bar (design handoff 1c): 88px, raised Report FAB in the middle. */
export function MobileTabBar() {
  const pathname = usePathname();
  const renderTab = (t: (typeof tabs)[number]) => {
    const active = t.match(pathname);
    return (
      <Link
        key={t.href}
        href={t.href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-1 flex-col items-center gap-1 pt-3 text-[11px] ${
          active ? "font-bold text-green" : "font-medium text-muted"
        }`}
      >
        <Icon name={t.icon} size={24} />
        {t.label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[88px] items-start border-t border-line bg-white pb-[env(safe-area-inset-bottom)]"
    >
      {tabs.slice(0, 2).map(renderTab)}
      <div className="flex flex-1 justify-center">
        <Link
          href="/report"
          aria-label="Report a hazard"
          className="-mt-[22px] flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-green text-white shadow-control"
        >
          <Icon name="plus" size={26} />
        </Link>
      </div>
      {tabs.slice(2).map(renderTab)}
    </nav>
  );
}
