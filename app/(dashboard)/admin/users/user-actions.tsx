"use client";

import { Button } from "@/components/ui/button";
import { setUserBanned, deleteUser } from "@/lib/actions/users";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function UserActions({
  userId,
  banned,
}: {
  userId: string;
  banned: boolean;
}) {
  const router = useRouter();

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={async () => {
          try {
            await setUserBanned(userId, !banned);
            toast.success(banned ? "User unbanned" : "User banned");
            router.refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        }}
      >
        {banned ? "Unban" : "Ban"}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={async () => {
          if (!confirm("Soft-delete this user?")) return;
          try {
            await deleteUser(userId);
            toast.success("User removed");
            router.refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        }}
      >
        Delete
      </Button>
    </>
  );
}
