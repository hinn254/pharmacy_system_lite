"use client";

import { useEffect, useId } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { upsertUser } from "@/lib/actions/users";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const schema = z.object({
  email: z.string().email(),
  name: z.string().optional().nullable(),
  password: z.string().min(8).optional().nullable().or(z.literal("")),
  role: z.nativeEnum(UserRole),
});

type FormValues = z.infer<typeof schema>;

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export function UserDialog({
  user,
  children,
}: {
  user?: UserRow | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const formId = useId();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      email: "",
      name: "",
      password: "",
      role: "CASHIER",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        email: user.email,
        name: user.name ?? "",
        password: "",
        role: user.role,
      });
    } else {
      form.reset({
        email: "",
        name: "",
        password: "",
        role: "CASHIER",
      });
    }
  }, [user, form]);

  async function onSubmit(values: FormValues) {
    try {
      await upsertUser(
        {
          email: values.email,
          name: values.name || null,
          password: values.password || null,
          role: values.role,
        },
        user?.id,
      );
      toast.success(user ? "User updated" : "User created");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? "Edit user" : "Invite user"}</DialogTitle>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col space-y-4"
        >
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...form.register("email")} />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...form.register("name")} />
          </div>
          <div className="space-y-2">
            <Label>Password {user && "(leave blank to keep)"}</Label>
            <Input type="password" autoComplete="new-password" {...form.register("password")} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={form.watch("role")}
              onValueChange={(v) => form.setValue("role", v as UserRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASHIER">Cashier</SelectItem>
                <SelectItem value="PHARM_TECH">Pharm tech</SelectItem>
                <SelectItem value="DOCTOR">Doctor</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form={formId}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
