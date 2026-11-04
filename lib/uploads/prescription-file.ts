export const MAX_PRESCRIPTION_FILE_SIZE = 8 * 1024 * 1024;

export const PRESCRIPTION_FILE_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

const ALLOWED_CONTENT_TYPES = new Set(Object.values(CONTENT_TYPE_BY_EXTENSION));

export function prescriptionFileExtension(fileName: string) {
  return fileName.split(".").pop()?.trim().toLowerCase() ?? "";
}

export function validatePrescriptionFile(file: {
  name: string;
  type: string;
  size: number;
}) {
  const extension = prescriptionFileExtension(file.name);
  const contentType = file.type.toLowerCase();
  const expectedContentType = CONTENT_TYPE_BY_EXTENSION[extension];

  if (!expectedContentType) {
    return "Use a JPG, JPEG, PNG, WebP, or PDF file.";
  }

  if (
    contentType &&
    contentType !== "application/octet-stream" &&
    (!ALLOWED_CONTENT_TYPES.has(contentType) || contentType !== expectedContentType)
  ) {
    return "The file type does not match its extension.";
  }

  if (file.size > MAX_PRESCRIPTION_FILE_SIZE) {
    return "Max file size is 8MB.";
  }

  return null;
}

export function prescriptionContentType(file: { name: string; type: string }) {
  return (
    CONTENT_TYPE_BY_EXTENSION[prescriptionFileExtension(file.name)] ??
    file.type ??
    "application/octet-stream"
  );
}

export function hasValidPrescriptionFileSignature(
  bytes: Uint8Array,
  extension: string,
) {
  switch (extension) {
    case "jpg":
    case "jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "png":
      return (
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
      );
    case "webp":
      return (
        String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
      );
    case "pdf":
      return String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
    default:
      return false;
  }
}

export function isPdfPrescription(file: { name: string; type: string }) {
  return (
    file.type.toLowerCase() === "application/pdf" ||
    prescriptionFileExtension(file.name) === "pdf"
  );
}
