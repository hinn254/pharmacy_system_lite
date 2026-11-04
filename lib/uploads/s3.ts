import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function requiredEnvAny(names: string[]) {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  throw new Error(`Missing env: ${names.join(" OR ")}`);
}

export function getUploadsBucket() {
  return requiredEnvAny([
    "UPLOADS_BUCKET",
    "R2_BUCKET_NAME",
    "CLOUDFLARE_R2_BUCKET_NAME",
    "BUCKET_NAME",
  ]);
}

export function getUploadsPublicBaseUrl() {
  return requiredEnvAny([
    "UPLOADS_PUBLIC_BASE_URL",
    "R2_PUBLIC_URL",
    "CLOUDFLARE_R2_PUBLIC_URL",
    "PUBLIC_URL",
  ]).replace(/\/+$/, "");
}

export function makeS3Client() {
  const region = process.env.UPLOADS_REGION || "auto";
  const accessKeyId = requiredEnvAny([
    "UPLOADS_ACCESS_KEY_ID",
    "R2_ACCESS_KEY_ID",
    "CLOUDFLARE_R2_ACCESS_KEY_ID",
    "ACCESS_KEY_ID",
  ]);
  const secretAccessKey = requiredEnvAny([
    "UPLOADS_SECRET_ACCESS_KEY",
    "R2_SECRET_ACCESS_KEY",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "SECRET_ACCESS_KEY",
  ]);

  const accountId =
    process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.ACCOUNT_ID;

  const endpoint =
    process.env.UPLOADS_ENDPOINT ||
    process.env.R2_ENDPOINT ||
    process.env.CLOUDFLARE_R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  // R2 works best with path-style URLs; standard AWS S3 defaults to virtual-hosted.
  const forcePathStyle =
    process.env.UPLOADS_FORCE_PATH_STYLE === "true" ||
    process.env.R2_FORCE_PATH_STYLE === "true" ||
    Boolean(accountId);

  return new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function putPublicObject(params: {
  key: string;
  body: Uint8Array;
  contentType: string;
}) {
  const s3 = makeS3Client();
  const Bucket = getUploadsBucket();

  await s3.send(
    new PutObjectCommand({
      Bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      ACL: "public-read",
    }),
  );

  const base = getUploadsPublicBaseUrl();
  return `${base}/${encodeURI(params.key).replace(/%2F/g, "/")}`;
}

