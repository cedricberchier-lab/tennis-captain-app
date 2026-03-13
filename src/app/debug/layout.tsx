import { Suspense } from "react";

export default function DebugLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
