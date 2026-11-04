import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { putPublicObject } from "@/lib/uploads/s3";
import {
  hasValidPrescriptionFileSignature,
  prescriptionContentType,
  prescriptionFileExtension,
  validatePrescriptionFile,
} from "@/lib/uploads/prescription-file";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(session.user.role === "ADMIN" || session.user.role === "PHARM_TECH")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  const validationError = validatePrescriptionFile(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const orgId = session.user.organizationId;
  const id = crypto.randomUUID();
  const ext = prescriptionFileExtension(file.name);
  const key = `${orgId}/pos-orders/prescriptions/${id}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidPrescriptionFileSignature(bytes, ext)) {
    return NextResponse.json(
      { error: "The selected file is not a valid JPG, PNG, WebP, or PDF." },
      { status: 400 },
    );
  }

  const url = await putPublicObject({
    key,
    body: bytes,
    contentType: prescriptionContentType(file),
  });

  return NextResponse.json({ url });
}
