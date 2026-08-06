import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, phoneNumber } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { prisma } from "./prisma";
import { sendSms } from "./sms";

const ac = createAccessControl({
  user: ["list", "set-role", "ban", "unban", "delete"] as const,
});

const clientRole = ac.newRole({ user: [] });
const adminRole = ac.newRole({ user: ["list", "set-role", "ban", "unban"] });
const superAdminRole = ac.newRole({ user: ["list", "set-role", "ban", "unban", "delete"] });

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  // Email/mot de passe (email = numéro@phone.ekonzo.cd pour les clients)
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    password: {
      hash: async (password: string) => {
        const { hash } = await import("bcryptjs");
        return hash(password, 12);
      },
      verify: async ({ hash, password }: { hash: string; password: string }) => {
        const { compare } = await import("bcryptjs");
        return compare(password, hash);
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24, // 24h
    updateAge: 60 * 60 * 12, // rafraîchit après 12h
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "CLIENT",
        input: false, // un utilisateur ne peut pas choisir son rôle à l'inscription
      },
    },
  },

  plugins: [
    // Connexion principale : numéro de téléphone + OTP SMS
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        console.log(`[OTP] → ${phoneNumber} : ${code}`);
        await sendSms(phoneNumber, `Votre code de vérification ekonzo : ${code}`);
      },
      otpLength: 6,
      expiresIn: 300, // 5 minutes
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone}@phone.ekonzo.cd`,
        getTempName: (phone) => phone,
      },
    }),

    // Gestion des rôles et du back-office
    admin({
      ac,
      roles: {
        CLIENT: clientRole,
        ADMIN: adminRole,
        SUPER_ADMIN: superAdminRole,
      },
      defaultRole: "CLIENT",
      adminRoles: ["ADMIN", "SUPER_ADMIN"],
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
