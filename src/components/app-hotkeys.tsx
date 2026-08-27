"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

function typingInField(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function AppHotkeys() {
  const router = useRouter();
  const pendingG = useRef(false);

  useEffect(() => {
    function go(href: string) {
      pendingG.current = false;
      router.push(href);
    }

    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "?" && !typingInField(event.target)) {
        event.preventDefault();
        toast.message("Keys", {
          description: "c write · n new file · g n Now · g o Operations · Ctrl+K jump",
        });
        return;
      }

      if (typingInField(event.target)) {
        pendingG.current = false;
        return;
      }

      if (pendingG.current) {
        pendingG.current = false;
        if (event.key === "n") {
          event.preventDefault();
          go("/now");
          return;
        }
        if (event.key === "o") {
          event.preventDefault();
          go("/operations");
          return;
        }
        if (event.key === "d") {
          event.preventDefault();
          go("/dashboard");
          return;
        }
        if (event.key === "s") {
          event.preventDefault();
          go("/sales");
          return;
        }
      }

      if (event.key === "g") {
        event.preventDefault();
        pendingG.current = true;
        window.setTimeout(() => {
          pendingG.current = false;
        }, 800);
        return;
      }

      if (event.key === "c") {
        event.preventDefault();
        const composer = document.getElementById("operation-composer");
        if (composer instanceof HTMLElement) {
          composer.focus();
          return;
        }
        go("/operations/new");
        return;
      }

      if (event.key === "n") {
        event.preventDefault();
        go("/operations/new");
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}
