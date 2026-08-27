import { Poppins } from "next/font/google";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s · Zoom ERP",
    default: "Zoom ERP",
  },
  description: "Zoom business management platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
      </head>
      <body className="min-h-full font-sans" suppressHydrationWarning>
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  );
}
