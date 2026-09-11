import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, emailOTP } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { prisma } from "./prisma";
import { sendOtpEmail } from "./mailer";

const ac = createAccessControl({
  user: ["list", "set-role", "ban", "unban", "delete"] as const,
});

const clientRole = ac.newRole({ user: [] });
const bankRole = ac.newRole({ user: [] });
const adminRole = ac.newRole({ user: ["list", "set-role", "ban", "unban"] });
const superAdminRole = ac.newRole({
  user: ["list", "set-role", "ban", "unban", "delete"],
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  emailAndPassword: {
    enabled: true,
    /** Inscription investisseur via /api/register (OTP d'abord). */
    disableSignUp: true,
    /** Un investisseur ne peut se connecter qu'après confirmation OTP. */
    requireEmailVerification: true,
    autoSignIn: false,
    password: {
      hash: async (password: string) => {
        const { hash } = await import("bcryptjs");
        return hash(password, 12);
      },
      verify: async ({
        hash,
        password,
      }: {
        hash: string;
        password: string;
      }) => {
        const { compare } = await import("bcryptjs");
        return compare(password, hash);
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24,
    updateAge: 60 * 60 * 12,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 2,
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "CLIENT",
        input: false,
      },
    },
  },

  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      sendVerificationOTP: async ({ email, otp, type }) => {
        console.log(`[OTP EMAIL] → ${email} (${type}) : ${otp}`);
        await sendOtpEmail(email, otp);
      },
    }),

    admin({
      ac,
      roles: {
        CLIENT: clientRole,
        BANK: bankRole,
        ADMIN: adminRole,
        SUPER_ADMIN: superAdminRole,
      },
      defaultRole: "CLIENT",
      adminRoles: ["ADMIN", "SUPER_ADMIN"],
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
