"use client";

import { Avatar } from "@/components/catalyst/avatar";
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from "@/components/catalyst/dropdown";
import { AppHotkeys } from "@/components/app-hotkeys";
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from "@/components/catalyst/navbar";
import { NavbarRecents } from "@/components/navbar-recents";
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from "@/components/catalyst/sidebar";
import { SidebarLayout } from "@/components/catalyst/sidebar-layout";
import {
  CommandPalette,
  openCommandPalette,
} from "@/components/command-palette";
import { navCapabilities } from "@/lib/app-capabilities";
import {
  ArrowRightStartOnRectangleIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
} from "@heroicons/react/16/solid";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
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

function navIsCurrent(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  return pathname.startsWith(`${href}/`);
}

function AccountDropdownMenu({
  anchor,
  onLogout,
}: {
  anchor: "top start" | "bottom end";
  onLogout: () => void;
}) {
  return (
    <DropdownMenu className="min-w-64" anchor={anchor}>
      <DropdownItem href="/settings">
        <Cog6ToothIcon />
        <DropdownLabel>Settings</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem onClick={onLogout}>
        <ArrowRightStartOnRectangleIcon />
        <DropdownLabel>Sign out</DropdownLabel>
      </DropdownItem>
    </DropdownMenu>
  );
}

export function ApplicationLayout({
  user,
  showUsersNav = false,
  children,
}: ApplicationLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const mainNav = navCapabilities("main", { admin: showUsersNav });
  const workNav = navCapabilities("work", { admin: showUsersNav });
  const controlNav = navCapabilities("control", { admin: showUsersNav });
  const systemNav = navCapabilities("system", { admin: showUsersNav });

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
      navbar={
        <Navbar>
          <NavbarItem onClick={openCommandPalette} aria-label="Jump or create (Ctrl+K)">
            <MagnifyingGlassIcon data-slot="icon" />
          </NavbarItem>
          <NavbarRecents />
          <NavbarSpacer />
          <NavbarSection>
            <Dropdown>
              <DropdownButton as={NavbarItem}>
                <Avatar initials="Z" square />
              </DropdownButton>
              <AccountDropdownMenu
                anchor="bottom end"
                onLogout={handleLogout}
              />
            </Dropdown>
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <SidebarItem href="/dashboard">
              <Avatar initials="Z" square />
              <SidebarLabel>Zoom ERP</SidebarLabel>
            </SidebarItem>
          </SidebarHeader>

          <SidebarBody>
            <SidebarSection>
              {mainNav.map((item) => {
                const Icon = item.icon;
                const href = item.href!;
                return (
                  <SidebarItem
                    key={item.id}
                    href={href}
                    current={navIsCurrent(pathname, href)}
                  >
                    <Icon data-slot="icon" />
                    <SidebarLabel>{item.label}</SidebarLabel>
                  </SidebarItem>
                );
              })}
            </SidebarSection>
            {workNav.length > 0 ? (
              <SidebarSection>
                <SidebarHeading>Work</SidebarHeading>
                {workNav.map((item) => {
                  const Icon = item.icon;
                  const href = item.href!;
                  return (
                    <SidebarItem
                      key={item.id}
                      href={href}
                      current={navIsCurrent(pathname, href)}
                    >
                      <Icon data-slot="icon" />
                      <SidebarLabel>{item.label}</SidebarLabel>
                    </SidebarItem>
                  );
                })}
              </SidebarSection>
            ) : null}
            {controlNav.length > 0 ? (
              <SidebarSection>
                <SidebarHeading>Control</SidebarHeading>
                {controlNav.map((item) => {
                  const Icon = item.icon;
                  const href = item.href!;
                  return (
                    <SidebarItem
                      key={item.id}
                      href={href}
                      current={navIsCurrent(pathname, href)}
                    >
                      <Icon data-slot="icon" />
                      <SidebarLabel>{item.label}</SidebarLabel>
                    </SidebarItem>
                  );
                })}
              </SidebarSection>
            ) : null}
            {systemNav.length > 0 ? (
              <SidebarSection>
                <SidebarHeading>System</SidebarHeading>
                {systemNav.map((item) => {
                  const Icon = item.icon;
                  const href = item.href!;
                  return (
                    <SidebarItem
                      key={item.id}
                      href={href}
                      current={navIsCurrent(pathname, href)}
                    >
                      <Icon data-slot="icon" />
                      <SidebarLabel>{item.label}</SidebarLabel>
                    </SidebarItem>
                  );
                })}
              </SidebarSection>
            ) : null}
          </SidebarBody>

          <SidebarFooter className="max-lg:hidden">
            <Dropdown>
              <DropdownButton as={SidebarItem}>
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar
                    initials={user.name.slice(0, 1).toUpperCase()}
                    className="size-10"
                    square
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm/5 font-medium text-zinc-950">
                      {user.name}
                    </span>
                    <span className="block truncate text-xs/5 font-normal text-zinc-500">
                      @{user.username} · {user.role}
                    </span>
                  </span>
                </span>
                <ChevronUpIcon />
              </DropdownButton>
              <AccountDropdownMenu
                anchor="top start"
                onLogout={handleLogout}
              />
            </Dropdown>
          </SidebarFooter>
        </Sidebar>
      }
    >
      {children}
      <CommandPalette admin={showUsersNav} />
      <AppHotkeys />
    </SidebarLayout>
  );
}
