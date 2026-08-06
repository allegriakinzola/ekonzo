import { createAuthClient } from "better-auth/react";
import { adminClient, phoneNumberClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [phoneNumberClient(), adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
