import { prisma } from "@/lib/prisma";
import {
  inferMomoOperator,
  isValidMomoPhone,
  normalizeMomoPhone,
} from "@/modules/payments/phone";

export type SettlementChannel = "MOBILE_MONEY" | "BANK_TRANSFER";

export type SettlementProfileInput = {
  preferredChannel: SettlementChannel;
  momoPhone?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
};

export type SettlementProfileView = {
  preferredChannel: SettlementChannel;
  momoPhone: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  isComplete: boolean;
  updatedAt: string | null;
};

function trimOrNull(value?: string | null): string | null {
  const v = value?.trim() ?? "";
  return v.length > 0 ? v : null;
}

export function isSettlementProfileComplete(
  profile: Pick<
    SettlementProfileView,
    | "preferredChannel"
    | "momoPhone"
    | "bankName"
    | "bankAccountNumber"
  >,
): boolean {
  if (profile.preferredChannel === "MOBILE_MONEY") {
    return Boolean(profile.momoPhone && isValidMomoPhone(profile.momoPhone));
  }
  return Boolean(
    profile.bankName &&
      profile.bankName.length >= 2 &&
      profile.bankAccountNumber &&
      profile.bankAccountNumber.length >= 5,
  );
}

export async function getSettlementProfile(
  userId: string,
): Promise<SettlementProfileView> {
  const [row, user] = await Promise.all([
    prisma.settlementProfile.findUnique({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { phoneNumber: true, name: true },
    }),
  ]);

  const momoPhone =
    (row?.momoPhone ? normalizeMomoPhone(row.momoPhone) : null) ||
    (user?.phoneNumber ? normalizeMomoPhone(user.phoneNumber) : null);

  const view: SettlementProfileView = {
    preferredChannel: row?.preferredChannel ?? "MOBILE_MONEY",
    momoPhone,
    bankName: row?.bankName ?? null,
    bankAccountNumber: row?.bankAccountNumber ?? null,
    bankAccountName: row?.bankAccountName ?? user?.name ?? null,
    isComplete: false,
    updatedAt: row?.updatedAt?.toISOString() ?? null,
  };
  view.isComplete = isSettlementProfileComplete(view);
  return view;
}

export async function upsertSettlementProfile(
  userId: string,
  input: SettlementProfileInput,
  opts?: { userName?: string | null },
): Promise<SettlementProfileView> {
  const preferredChannel = input.preferredChannel;
  let momoPhone = trimOrNull(input.momoPhone);
  if (momoPhone) {
    momoPhone = normalizeMomoPhone(momoPhone);
    if (!isValidMomoPhone(momoPhone)) {
      throw new Error(
        "Numéro Mobile Money invalide (9 chiffres, ex. 812345678).",
      );
    }
  }

  const bankName = trimOrNull(input.bankName);
  const bankAccountNumber = trimOrNull(input.bankAccountNumber);
  const bankAccountName =
    trimOrNull(input.bankAccountName) ?? trimOrNull(opts?.userName ?? null);

  if (preferredChannel === "MOBILE_MONEY" && !momoPhone) {
    throw new Error("Le numéro Mobile Money est requis.");
  }
  if (preferredChannel === "BANK_TRANSFER") {
    if (!bankName || bankName.length < 2) {
      throw new Error("Le nom de la banque est requis.");
    }
    if (!bankAccountNumber || bankAccountNumber.length < 5) {
      throw new Error("Le numéro de compte bancaire est requis.");
    }
  }

  const row = await prisma.settlementProfile.upsert({
    where: { userId },
    create: {
      userId,
      preferredChannel,
      momoPhone,
      bankName,
      bankAccountNumber,
      bankAccountName,
    },
    update: {
      preferredChannel,
      momoPhone,
      bankName,
      bankAccountNumber,
      bankAccountName,
    },
  });

  // Synchroniser les comptes de paiement par défaut pour les souscriptions.
  if (momoPhone) {
    const operator = inferMomoOperator(momoPhone);
    await prisma.momoAccount.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
    await prisma.momoAccount.upsert({
      where: {
        userId_operator_phoneNumber: {
          userId,
          operator,
          phoneNumber: momoPhone,
        },
      },
      update: {
        isDefault: true,
        accountName: bankAccountName ?? opts?.userName ?? "",
      },
      create: {
        userId,
        operator,
        phoneNumber: momoPhone,
        accountName: bankAccountName ?? opts?.userName ?? "",
        isDefault: true,
      },
    });
  }

  if (bankName && bankAccountNumber) {
    await prisma.bankAccount.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
    // Un RIB peut servir en CDF et USD : on crée/maj en CDF (devise principale locale)
    // et on marque isDefault ; la souscription upsert aussi selon la devise produit.
    await prisma.bankAccount.upsert({
      where: {
        userId_accountNumber_currency: {
          userId,
          accountNumber: bankAccountNumber,
          currency: "CDF",
        },
      },
      update: {
        bankName,
        accountName: bankAccountName ?? opts?.userName ?? "",
        isDefault: true,
      },
      create: {
        userId,
        bankName,
        accountNumber: bankAccountNumber,
        accountName: bankAccountName ?? opts?.userName ?? "",
        currency: "CDF",
        channel: "SIMAD",
        isDefault: true,
      },
    });
  }

  const view: SettlementProfileView = {
    preferredChannel: row.preferredChannel,
    momoPhone: row.momoPhone,
    bankName: row.bankName,
    bankAccountNumber: row.bankAccountNumber,
    bankAccountName: row.bankAccountName,
    isComplete: false,
    updatedAt: row.updatedAt.toISOString(),
  };
  view.isComplete = isSettlementProfileComplete(view);
  return view;
}
