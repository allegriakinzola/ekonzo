export type KycDocType = "CNI" | "PASSPORT" | "PERMIS";

/** Données extraites du document par OCR — pré-remplissent le formulaire. */
export interface KycExtractedData {
  firstName?: string;
  lastName?: string;
  postName?: string;
  dateOfBirth?: string;
  docNumber?: string;
  address?: string;
  rawText?: string;
}

export interface KycSubmission {
  userId: string;
  docType: KycDocType;
  firstName: string;
  lastName: string;
  postName?: string;
  dateOfBirth?: string;
  docNumber?: string;
  address?: string;
  docFrontPath: string;
  selfiePath: string;
}

export interface KycFaceMatchResult {
  faceMatch: boolean;
  similarity: number;
}

export interface KycVerificationResult {
  approved: boolean;
  confidence: number;
  checks: {
    faceMatch: boolean;
  };
  rejectionReason?: string;
}

export interface KycProvider {
  /** Extrait les données du document (OCR). */
  extractDocument(docPath: string): Promise<KycExtractedData>;
  /** Compare le visage du document avec le selfie. */
  compareFaces(docPath: string, selfiePath: string): Promise<KycFaceMatchResult>;
}
