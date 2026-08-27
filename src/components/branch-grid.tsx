import { Badge } from "@/components/catalyst/badge";
import { Subheading } from "@/components/catalyst/heading";
import { Link } from "@/components/catalyst/link";
import { Text } from "@/components/catalyst/text";
import { erpBranches, type ErpBranch } from "@/lib/erp-branches";

function BranchCard({ branch }: { branch: ErpBranch }) {
  const Icon = branch.icon;
  const isLive = branch.status === "live" && branch.href;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-950/5">
          <Icon className="size-5 text-zinc-600" />
        </span>
        <Badge color={isLive ? "green" : "zinc"}>
          {isLive ? "Live" : "Planned"}
        </Badge>
      </div>
      <Subheading level={3} className="mt-4">
        {branch.name}
      </Subheading>
      <Text className="mt-1">{branch.description}</Text>
    </>
  );

  if (isLive) {
    return (
      <Link
        href={branch.href!}
        className="block rounded-lg p-5 ring-1 ring-zinc-950/5 transition hover:bg-zinc-950/2.5"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-lg p-5 ring-1 ring-zinc-950/5">{content}</div>
  );
}

export function BranchGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {erpBranches.map((branch) => (
        <BranchCard key={branch.id} branch={branch} />
      ))}
    </div>
  );
}
