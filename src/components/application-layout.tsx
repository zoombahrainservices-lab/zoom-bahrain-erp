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
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from "@/components/catalyst/navbar";
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from "@/components/catalyst/sidebar";
import { SidebarLayout } from "@/components/catalyst/sidebar-layout";
import {
  ArrowRightStartOnRectangleIcon,
  ChevronUpIcon,
} from "@heroicons/react/16/solid";
import {
  CheckCircleIcon,
  Cog6ToothIcon,
  HomeIcon,
  SwatchIcon,
  UserGroupIcon,
} from "@heroicons/react/20/solid";
import { usePathname, useRouter } from "next/navigation";

type ApplicationLayoutProps = {
  user: {
    name: string;
    username: string;
    role: string;
  };
  children: React.ReactNode;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/clients", label: "Clients", icon: UserGroupIcon },
  { href: "/tasks", label: "Tasks", icon: CheckCircleIcon },
  { href: "/settings", label: "Settings", icon: Cog6ToothIcon },
  { href: "/branding", label: "Branding", icon: SwatchIcon },
];

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

export function ApplicationLayout({ user, children }: ApplicationLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <SidebarLayout
      navbar={
        <Navbar>
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
              {navItems.map(({ href, label, icon: Icon }) => (
                <SidebarItem
                  key={href}
                  href={href}
                  current={pathname === href}
                >
                  <Icon data-slot="icon" />
                  <SidebarLabel>{label}</SidebarLabel>
                </SidebarItem>
              ))}
            </SidebarSection>
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
    </SidebarLayout>
  );
}
