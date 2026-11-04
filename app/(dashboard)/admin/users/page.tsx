import { listUsers } from "@/lib/actions/users";
import { UserDialog } from "@/components/user-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { UserActions } from "./user-actions";

export default async function AdminUsersPage() {
  const users = await listUsers();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-muted-foreground text-sm">
            Add, ban, or remove accounts (admin only)
          </p>
        </div>
        <UserDialog>
          <Button>Add user</Button>
        </UserDialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[200px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{u.role}</Badge>
                </TableCell>
                <TableCell>
                  {u.deletedAt ? (
                    <StatusBadge status="DELETED" />
                  ) : u.bannedAt ? (
                    <StatusBadge status="BANNED" />
                  ) : (
                    <StatusBadge status="ACTIVE" />
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <UserDialog user={u}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </UserDialog>
                    {!u.deletedAt && <UserActions userId={u.id} banned={!!u.bannedAt} />}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
