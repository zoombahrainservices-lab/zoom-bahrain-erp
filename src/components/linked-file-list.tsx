import { Text } from "@/components/catalyst/text";
import { DescriptionCard } from "@/components/description-card";
import { IconDetailRow, zebraRowClass } from "@/components/company-profile-ui";
import type { LinkedFileRecord } from "@/lib/division-profiles";

type LinkedFileListProps<T extends string> = {
  title: string;
  description: string;
  records: LinkedFileRecord<T>[];
  typeLabels: Record<T, string>;
};

export function LinkedFileList<T extends string>({
  title,
  description,
  records,
  typeLabels,
}: LinkedFileListProps<T>) {
  return (
    <DescriptionCard
      variant="accent"
      layout="content"
      title={title}
      description={description}
      contentClassName="p-0"
    >
      {records.map((item, index) => (
        <article key={item.id} className={zebraRowClass(index)}>
          <p className="text-xs font-semibold uppercase tracking-wide text-zoom-gray">
            {index + 1}. {typeLabels[item.type]}
          </p>
          <h4 className="mt-2 text-sm font-semibold tracking-wide text-zoom-dark">
            {item.title.toUpperCase()}
          </h4>
          <Text className="mt-2 text-sm leading-relaxed text-zoom-charcoal sm:text-base">
            {item.description}
          </Text>
          <IconDetailRow icon="download">
            {item.fileUrl ? (
              <a
                href={item.fileUrl}
                download={item.fileName ?? true}
                className="font-medium text-zoom-light underline decoration-zoom-light/50 hover:decoration-zoom-light"
              >
                Download{item.fileName ? ` ${item.fileName}` : ""}
              </a>
            ) : (
              <span className="text-zoom-gray">Not linked from ERP yet</span>
            )}
          </IconDetailRow>
        </article>
      ))}
    </DescriptionCard>
  );
}
