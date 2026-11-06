import { deleteExpiredDemoWorkspaces } from "@/lib/demo/workspace";

async function clean(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const result = await deleteExpiredDemoWorkspaces();
  return Response.json({ ok: true, deleted: result.count });
}

export const GET = clean;
export const POST = clean;
