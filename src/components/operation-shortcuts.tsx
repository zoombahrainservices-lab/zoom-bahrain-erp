"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/catalyst/button";
import {
  isOperationPinned,
  rememberLastOperation,
  togglePinnedOperation,
  type RememberedOperation,
} from "@/lib/workspace-memory";

export function OperationShortcuts({
  operation,
  briefing,
}: {
  operation: RememberedOperation;
  briefing?: string;
}) {
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    rememberLastOperation(operation);
    setPinned(isOperationPinned(operation.id));
  }, [operation, operation.id]);

  return (
    <div className="flex flex-wrap justify-end gap-1">
      <Button
        type="button"
        plain
        onClick={() => {
          void navigator.clipboard.writeText(window.location.href);
          toast.success("Link copied");
        }}
      >
        Copy link
      </Button>
      <Button
        type="button"
        plain
        onClick={() => {
          setPinned(togglePinnedOperation(operation));
        }}
      >
        {pinned ? "Pinned" : "Pin"}
      </Button>
      {briefing ? (
        <Button
          type="button"
          plain
          onClick={() => {
            void navigator.clipboard.writeText(briefing);
            toast.success("Briefing copied");
          }}
        >
          Copy briefing
        </Button>
      ) : null}
    </div>
  );
}
