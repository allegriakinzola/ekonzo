import type { KycProvider, KycExtractedData, KycFaceMatchResult } from "../kyc.types";

/**
 * Provider manuel — MVP sans IA.
 * Aucune extraction automatique, aucun face match → revue admin obligatoire.
 */
export class ManualKycProvider implements KycProvider {
  async extractDocument(_docPath: string): Promise<KycExtractedData> {
    return {};
  }

  async compareFaces(_docPath: string, _selfiePath: string): Promise<KycFaceMatchResult> {
    return { faceMatch: false, similarity: 0 };
  }
}
