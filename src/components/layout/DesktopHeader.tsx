"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";
import { canModerate, canSeeSos, useProfile } from "@/lib/auth/useProfile";

type NavItem = { href: string; label: string; icon: IconName; match: (p: string) => boolean };

/** Desktop header (design handoff 1a): logo, nav pills, SOS and Report buttons, avatar. */
export function DesktopHeader() {
  const pathname = usePathname();
  const { profile } = useProfile();

  const nav: NavItem[] = [
    { href: "/", label: "Map", icon: "map", match: (p) => p === "/" },
    { href: "/incidents", label: "Incident List", icon: "list", match: (p) => p.startsWith("/incidents") },
    { href: "/facilities", label: "Facilities", icon: "home", match: (p) => p.startsWith("/facilities") },
  ];
  if (canModerate(profile?.role)) {
    nav.push({ href: "/moderate", label: "Moderate", icon: "check", match: (p) => p.startsWith("/moderate") });
  }
  if (canSeeSos(profile?.role)) {
    nav.push({ href: "/respond", label: "Respond", icon: "alert", match: (p) => p.startsWith("/respond") });
  }
  if (profile?.role === "admin") {
    nav.push({ href: "/admin", label: "Admin", icon: "sliders", match: (p) => p.startsWith("/admin") });
  }
  nav.push({ href: "/profile", label: "Settings", icon: "sliders", match: (p) => p.startsWith("/profile") });

  return (
    <header className="flex h-[72px] shrink-0 items-center gap-4 border-b border-line bg-white px-4 lg:gap-7 lg:px-6">
      <Link href="/" className="flex items-center gap-3" aria-label="Bakunawa home">
        <Image src="/brand/bakunawa-mark.png" alt="" width={46} height={44} priority />
        <span className="hidden leading-tight lg:block">
          <span className="font-display block text-[20px] font-extrabold tracking-[.05em] text-ink">
            BAKUNAWA
          </span>
          <span className="block text-[12px] text-text-2">Disaster Intelligence Platform</span>
        </span>
      </Link>
      <span className="h-8 w-px bg-line" aria-hidden />
      <nav className="flex items-center gap-1" aria-label="Main">
        {nav.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={item.label}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2.5 text-[14.5px] font-semibold transition-colors xl:px-4 ${
                active ? "bg-green-tint text-green" : "text-text-3 hover:bg-hover"
              }`}
            >
              <Icon name={item.icon} size={19} />
              <span className="hidden xl:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/sos"
          className="flex h-11 items-center gap-2 rounded-xl border-[1.5px] border-sos bg-white px-4 text-[14.5px] font-semibold text-sos hover:bg-sos-bg"
        >
          <Icon name="alert" size={19} />
          <span className="whitespace-nowrap">SOS<span className="hidden lg:inline"> Emergency</span></span>
        </Link>
        <Link
          href="/report"
          className="flex h-11 items-center gap-2 rounded-xl bg-green px-4 text-[14.5px] font-semibold text-white hover:brightness-95"
        >
          <Icon name="plus" size={19} />
          <span className="whitespace-nowrap">Report<span className="hidden lg:inline"> Hazard</span></span>
        </Link>
        <Link
          href="/profile"
          className="flex items-center gap-1 text-text-3"
          aria-label={profile ? `Account: ${profile.display_name}` : "Sign in"}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-tint text-green">
            {profile ? (
              <span className="text-[14px] font-bold">{initials(profile.display_name)}</span>
            ) : (
              <Icon name="user" size={20} />
            )}
          </span>
          <Icon name="chevd" size={16} />
        </Link>
      </div>
    </header>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !w.endsWith("."))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
