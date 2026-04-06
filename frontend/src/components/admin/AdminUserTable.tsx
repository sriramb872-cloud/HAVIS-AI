import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface AdminUser {
  user_id: string;
  email: string;
  created_at: string;
}

export const AdminUserTable = ({ users }: { users: AdminUser[] }) => {
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[300px] font-semibold">User ID</TableHead>
            <TableHead className="font-semibold">EmailAddress</TableHead>
            <TableHead className="font-semibold">Created At</TableHead>
            <TableHead className="text-right font-semibold">Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.user_id} className="hover:bg-primary/5 transition-colors">
              <TableCell className="font-mono text-xs text-muted-foreground">{user.user_id}</TableCell>
              <TableCell className="font-medium">{user.email}</TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(user.created_at), "MMM d, yyyy HH:mm")}
              </TableCell>
              <TableCell className="text-right">
                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset bg-muted text-muted-foreground ring-muted-foreground/10">
                  User
                </span>
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No users found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
