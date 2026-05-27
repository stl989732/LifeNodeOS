import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import LinoOnboarding from "@/src/components/LinoOnboarding";
import {
  HAT_KEY_TO_ACTIVE,
  isShellHatKey,
} from "@/lib/node-mappings";

export const dynamic = "force-dynamic";

export default async function NodeOnboardingPage({
  params,
}: {
  params: Promise<{ node: string }>;
}) {
  const { node: param } = await params;
  if (!isShellHatKey(param)) notFound();

  const session = await auth();
  if (!session?.user?.id) {
    const callback = encodeURIComponent(`/onboarding/${param}`);
    redirect(`/auth/signin?callbackUrl=${callback}`);
  }

  return <LinoOnboarding node={HAT_KEY_TO_ACTIVE[param]} />;
}
