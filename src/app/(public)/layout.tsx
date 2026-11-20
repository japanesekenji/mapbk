import { AppShell } from "@/components/layout/AppShell";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
