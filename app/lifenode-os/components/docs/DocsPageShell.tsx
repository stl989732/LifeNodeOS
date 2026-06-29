import type { ReactNode } from "react";
import LegalPageShell from "@/src/components/legal/LegalPageShell";
import DocsHubNav from "./DocsHubNav";

type Props = {
  children: ReactNode;
};

export default function DocsPageShell({ children }: Props) {
  return (
    <LegalPageShell backHref="/" backLabel="Back to LifeNode OS">
      <DocsHubNav />
      {children}
    </LegalPageShell>
  );
}
