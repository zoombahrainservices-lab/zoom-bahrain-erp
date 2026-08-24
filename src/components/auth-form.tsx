"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/catalyst/button";
import { Field, Label } from "@/components/catalyst/fieldset";
import { Heading, Subheading } from "@/components/catalyst/heading";
import { Input } from "@/components/catalyst/input";
import { Strong, Text, TextLink } from "@/components/catalyst/text";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "register"
            ? { name, username, password }
            : { username, password },
        ),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Something went wrong");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
      <div>
        <Subheading>Zoom ERP</Subheading>
        <Text>Business management</Text>
      </div>

      <Heading>{mode === "login" ? "Sign in" : "Create account"}</Heading>

      {mode === "register" ? (
        <Field>
          <Label>Full name</Label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>
      ) : null}

      <Field>
        <Label>Username</Label>
        <Input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          required
        />
      </Field>

      <Field>
        <Label>Password</Label>
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={
            mode === "login" ? "current-password" : "new-password"
          }
          required
          minLength={6}
        />
      </Field>

      {error ? (
        <Text className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-red-700">
          {error}
        </Text>
      ) : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? "Please wait..."
          : mode === "login"
            ? "Sign in"
            : "Create account"}
      </Button>

      <Text>
        {mode === "login" ? "No account yet? " : "Already have an account? "}
        <TextLink href={mode === "login" ? "/register" : "/login"}>
          <Strong>
            {mode === "login" ? "Create one" : "Sign in"}
          </Strong>
        </TextLink>
      </Text>
    </form>
  );
}
