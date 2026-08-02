import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { storageProvider: true, googleRefreshToken: true },
  });
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="font-display text-2xl mb-6">Settings</h1>
      <SettingsClient
        storageProvider={user.storageProvider}
        googleDriveConnected={Boolean(user.googleRefreshToken)}
      />
    </div>
  );
}
