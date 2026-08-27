import { notFound, redirect } from "next/navigation";

import { DivisionProfileHeader } from "@/components/division-profile-header";
import {
  DivisionProfileView,
  parseProfileArea,
} from "@/components/division-profile-view";
import { getDivisionProfile } from "@/lib/division-profiles";
import { getDivisionById } from "@/lib/divisions";
import { isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";

type DivisionProfilePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ area?: string | string[] }>;
};

export default async function DivisionProfilePage({
  params,
  searchParams,
}: DivisionProfilePageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (isClientUser(session)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const query = await searchParams;
  const company = getDivisionById(id);
  const profile = getDivisionProfile(id);

  if (!company || !profile) {
    notFound();
  }

  return (
    <>
      <DivisionProfileHeader division={company} profile={profile} />

      <div className="mt-8">
        <DivisionProfileView
          company={company}
          profile={profile}
          area={parseProfileArea(query.area)}
        />
      </div>
    </>
  );
}
