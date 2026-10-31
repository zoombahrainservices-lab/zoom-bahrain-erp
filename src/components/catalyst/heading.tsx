import clsx from "clsx";

type HeadingProps = { level?: 1 | 2 | 3 | 4 | 5 | 6 } & React.ComponentPropsWithoutRef<
  "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
>;

export function Heading({ className, level = 1, ...props }: HeadingProps) {
  const Element: `h${typeof level}` = `h${level}`;

  return (
    <Element
      {...props}
      className={clsx(
        className,
        level === 1 &&
          "text-2xl/8 font-semibold tracking-tight text-zoom-navy sm:text-3xl/9 dark:text-heading",
        level === 2 &&
          "text-lg/7 font-semibold text-zoom-dark sm:text-xl/8 dark:text-heading",
        level === 3 &&
          "text-base/7 font-semibold text-zoom-dark sm:text-lg/7 dark:text-heading",
        level > 3 && "text-base/6 font-semibold text-zoom-charcoal dark:text-foreground",
      )}
    />
  );
}

export function Subheading({ className, level = 2, ...props }: HeadingProps) {
  const Element: `h${typeof level}` = `h${level}`;

  return (
    <Element
      {...props}
      className={clsx(
        className,
        "text-lg/7 font-semibold text-zoom-dark sm:text-xl/8 dark:text-heading",
      )}
    />
  );
}
