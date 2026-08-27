import { redirect } from "next/navigation";

import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { NowBoard } from "@/components/now-board";
import { bahrainClock, greetingForName } from "@/lib/greeting";
import { getNowBoard } from "@/lib/list-now";
import { canAccessOperations, isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function NowPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (isClientUser(session)) {
    return (
      <>
        <Heading>{greetingForName(session.name)}</Heading>
        <Text className="mt-4">
          Your client account is active. More features for the client role will
          be added soon.
        </Text>
      </>
    );
  }

  if (!canAccessOperations(session)) {
    redirect("/dashboard");
  }

  const board = await getNowBoard();

  return (
    <NowBoard
      greeting={greetingForName(session.name)}
      clock={bahrainClock()}
      needsYou={board.needsYou}
      latest={board.latest}
      quiet={board.quiet}
    />
  );
}
