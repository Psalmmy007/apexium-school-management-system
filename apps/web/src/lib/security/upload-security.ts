import crypto from "crypto";

export interface UploadValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedFileName: string;
  fileHash: string;
  mimeType: string;
  fileSize: number;
}

const DANGEROUS_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "php", "js", "sh", "vbs", "ps1", "html", "htm",
  "asp", "aspx", "jsp", "jar", "cgi", "pl", "py", "scr", "dll", "sys",
  "svg", "htc", "com", "pif", "application"
]);

const ALLOWED_MIME_TYPES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
  "application/msword": [[0xd0, 0xcf, 0x11, 0xe0]],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [[0x50, 0x4b, 0x03, 0x04]], // PK..
};

/**
 * Sanitizes a filename to prevent path traversal and shell injection.
 */
export function sanitizeFileName(originalName: string): string {
  const baseName = originalName.replace(/^.*[\\/]/, "");
  return baseName.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
}

/**
 * Computes SHA-256 hash of a file buffer for duplicate detection and audit integrity.
 */
export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Validates a file buffer by inspecting magic bytes, file extension blocklists, and size limits.
 */
export function validateUploadBuffer(
  buffer: Buffer,
  originalFileName: string,
  declaredMimeType: string,
  maxSizeBytes: number = 10 * 1024 * 1024
): UploadValidationResult {
  const fileSize = buffer.length;
  const sanitizedFileName = sanitizeFileName(originalFileName);
  const fileHash = computeFileHash(buffer);

  // 1. File size cap check
  if (fileSize > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `File size exceeds maximum allowed limit of ${maxMb}MB.`,
      sanitizedFileName,
      fileHash,
      mimeType: declaredMimeType,
      fileSize,
    };
  }

  // 2. Extension validation & dangerous executable blocklist
  const ext = sanitizedFileName.split(".").pop()?.toLowerCase() || "";
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return {
      isValid: false,
      error: `Executable or potentially dangerous file extension (.${ext}) is strictly prohibited.`,
      sanitizedFileName,
      fileHash,
      mimeType: declaredMimeType,
      fileSize,
    };
  }

  // 3. Magic-number header byte verification
  let magicValid = false;

  for (const [mime, signatures] of Object.entries(ALLOWED_MIME_TYPES)) {
    for (const sig of signatures) {
      if (buffer.length >= sig.length) {
        const matches = sig.every((byte, idx) => buffer[idx] === byte);
        if (matches) {
          magicValid = true;
          break;
        }
      }
    }
    if (magicValid) break;
  }

  if (!magicValid) {
    return {
      isValid: false,
      error: "File content magic-number verification failed. The file format is corrupted or unsupported.",
      sanitizedFileName,
      fileHash,
      mimeType: declaredMimeType,
      fileSize,
    };
  }

  return {
    isValid: true,
    sanitizedFileName,
    fileHash,
    mimeType: declaredMimeType,
    fileSize,
  };
}
