import { LinkedFileList } from "@/components/linked-file-list";
import { assetTypeLabels, type DivisionProfile } from "@/lib/division-profiles";

export function AssetsProfile({ profile }: { profile: DivisionProfile }) {
  return (
    <LinkedFileList
      title="Assets"
      description="Ready-to-send catalogs, brochures, promotions, posters and social packs. Download when the file is linked from ERP."
      records={profile.assets}
      typeLabels={assetTypeLabels}
    />
  );
}
