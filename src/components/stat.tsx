import { Divider } from "@/components/catalyst/divider";
import { Link } from "@/components/catalyst/link";

export function Stat({
  title,
  value,
  href,
}: {
  title: string;
  value: number;
  href?: string;
}) {
  const content = (
    <>
      <Divider />
      <div className="mt-6 text-lg/6 font-medium sm:text-sm/6">{title}</div>
      <div className="mt-3 text-3xl/8 font-semibold sm:text-2xl/8">{value}</div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-lg transition hover:bg-zinc-950/2.5">
        {content}
      </Link>
    );
  }

  return <div>{content}</div>;
}
