import os from "os";
import path from "path";

/**
 * Sur Vercel / serverless, le FS de l'app est en lecture seule.
 * On écrit dans /tmp (éphémère, OK dans une même requête).
 * En local : uploads/kyc sous le cwd.
 */
export function getKycUploadRoot(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "ekonzo-kyc");
  }
  return path.join(process.cwd(), "uploads", "kyc");
}

export function getKycUserDir(userId: string): string {
  return path.join(getKycUploadRoot(), userId);
}
