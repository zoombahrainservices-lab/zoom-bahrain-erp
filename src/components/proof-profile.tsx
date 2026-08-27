import { LinkedFileList } from "@/components/linked-file-list";
import { proofTypeLabels, type DivisionProfile } from "@/lib/division-profiles";

export function ProofProfile({ profile }: { profile: DivisionProfile }) {
  return (
    <LinkedFileList
      title="Proof"
      description="Completed work, closed clients and testimonials. Files will download here once they are linked from ERP."
      records={profile.proof}
      typeLabels={proofTypeLabels}
    />
  );
}
