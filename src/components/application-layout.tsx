"use client";

import { AppHotkeys } from "@/components/app-hotkeys";
import {
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
} from "@/components/catalyst/dropdown";
import { SidebarLayout } from "@/components/catalyst/sidebar-layout";
import { CommandPalette } from "@/components/command-palette";
import { ShellSidebar } from "@/components/shell-sidebar";
import { ShellToolbar } from "@/components/shell-toolbar";
import {
  ArrowRightStartOnRectangleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/16/solid";
import { usePathname, useRouter } from "next/navigation";

type ApplicationLayoutProps = {
  user: {
    name: string;
    username: string;
    role: string;
  };
  showUsersNav?: boolean;
  children: React.ReactNode;
};

function AccountMenu({ onLogout }: { onLogout: () => void }) {
  return (
    <>
      <DropdownItem href="/settings">
        <Cog6ToothIcon />
        <DropdownLabel>Settings</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem onClick={onLogout}>
        <ArrowRightStartOnRectangleIcon />
        <DropdownLabel>Sign out</DropdownLabel>
      </DropdownItem>
    </>
  );
}

export function ApplicationLayout({
  user,
  showUsersNav = false,
  children,
}: ApplicationLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <SidebarLayout
      flushContent={
        pathname === "/organizations/new" ||
        pathname === "/contacts/new" ||
        pathname === "/operations/new" ||
        /^\/operations\/[^/]+$/.test(pathname)
      }
      navbar={<ShellToolbar admin={showUsersNav} menu={<AccountMenu onLogout={handleLogout} />} />}
      sidebar={
        <ShellSidebar
          admin={showUsersNav}
          user={user}
          menu={<AccountMenu onLogout={handleLogout} />}
        />
      }
    >
      {children}
      <CommandPalette admin={showUsersNav} />
      <AppHotkeys />
    </SidebarLayout>
  );
}
