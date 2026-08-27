"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/catalyst/button";
import { Field, Label } from "@/components/catalyst/fieldset";
import { Heading } from "@/components/catalyst/heading";
import { Input } from "@/components/catalyst/input";
import { Text, TextLink } from "@/components/catalyst/text";

type AuthFormProps = {
  mode: "login" | "register";
};

const copy = {
  login: {
    title: "Sign in",
    subtitle: "Use your Zoom ERP username and password.",
    submit: "Sign in",
    switch: "No account yet?",
    switchLink: "Create one",
    switchHref: "/register",
  },
  register: {
    title: "Create account",
    subtitle: "Fill in the fields below to get started.",
    submit: "Create account",
    switch: "Already have an account?",
    switchLink: "Sign in",
    switchHref: "/login",
  },
} as const;

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const text = copy[mode];

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
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm"
    >
      <header className="mb-8">
        <Text className="text-sm font-medium text-zinc-500">Zoom ERP</Text>
        <Heading className="mt-2">{text.title}</Heading>
        <Text className="mt-2 text-zinc-600">{text.subtitle}</Text>
      </header>

      <div className="space-y-4">
        {mode === "register" ? (
          <Field>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </Field>
        ) : null}

        <Field>
          <Label>Username</Label>
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="username"
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
            placeholder={mode === "register" ? "At least 6 characters" : ""}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={6}
          />
        </Field>
      </div>

      {error ? (
        <Text className="mt-4 text-sm text-red-600">{error}</Text>
      ) : null}

      <Button type="submit" className="mt-6 w-full" disabled={loading}>
        {loading ? "Please wait..." : text.submit}
      </Button>

      <Text className="mt-6 text-center text-sm text-zinc-500">
        {text.switch}{" "}
        <TextLink href={text.switchHref} className="text-zinc-950">
          {text.switchLink}
        </TextLink>
      </Text>
    </form>
  );
}
