"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Badge } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import { Field, FieldGroup, Label } from "@/components/catalyst/fieldset";
import { Heading } from "@/components/catalyst/heading";
import { Input } from "@/components/catalyst/input";
import { Select } from "@/components/catalyst/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/catalyst/table";
import { Text } from "@/components/catalyst/text";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/db/schema";
import { roleLabels } from "@/lib/permissions";

type UserRow = {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt: string;
};

const roleColors: Record<UserRole, "red" | "blue" | "zinc"> = {
  admin: "red",
  employee: "blue",
  client: "zinc",
};

type UsersPageClientProps = {
  initialUsers: UserRow[];
  currentUserId: string;
};

export function UsersPageClient({
  initialUsers,
  currentUserId,
}: UsersPageClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("employee");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name)),
    [users],
  );

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password, role }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create user");
      }

      setUsers((current) => [...current, data.user]);
      setName("");
      setUsername("");
      setPassword("");
      setRole("employee");
      router.refresh();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create user",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(userId: string, nextRole: UserRole) {
    setUpdatingId(userId);
    setError("");

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update role");
      }

      setUsers((current) =>
        current.map((user) => (user.id === userId ? data.user : user)),
      );
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update role",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <form
        onSubmit={handleCreate}
        className="mb-10 rounded-lg bg-white p-6 shadow-xs ring-1 ring-zinc-950/5"
      >
        <Heading level={2}>Add user</Heading>
        <Text className="mt-2">
          Create platform logins here. Roles control what each person can do.
        </Text>
        <FieldGroup className="mt-6 grid gap-4 md:grid-cols-2">
          <Field>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field>
            <Label>Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </Field>
          <Field>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <Field>
            <Label>Role</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
              <option value="client">Client</option>
            </Select>
          </Field>
        </FieldGroup>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="mt-6" disabled={creating}>
          {creating ? "Creating..." : "Add user"}
        </Button>
      </form>

      <Table className="[--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        <TableHead>
          <TableRow>
            <TableHeader>Name</TableHeader>
            <TableHeader>Username</TableHeader>
            <TableHeader>Role</TableHeader>
            <TableHeader>Added</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedUsers.map((user) => {
            const isSelf = user.id === currentUserId;

            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>@{user.username}</TableCell>
                <TableCell>
                  {isSelf ? (
                    <Badge color={roleColors[user.role]}>{roleLabels[user.role]}</Badge>
                  ) : (
                    <Select
                      value={user.role}
                      disabled={updatingId === user.id}
                      onChange={(e) =>
                        handleRoleChange(user.id, e.target.value as UserRole)
                      }
                      className="max-w-40"
                    >
                      <option value="admin">Admin</option>
                      <option value="employee">Employee</option>
                      <option value="client">Client</option>
                    </Select>
                  )}
                </TableCell>
                <TableCell className="text-zinc-500">
                  {formatDate(user.createdAt)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
