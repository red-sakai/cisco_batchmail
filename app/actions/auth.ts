"use server";

import {
  createSession,
  destroySession,
  verifyCredentials,
} from "@/lib/auth";

export type SignInResult = { ok: boolean; error?: string };

export async function signInAction(
  email: string,
  password: string
): Promise<SignInResult> {
  if (!email.trim() || !password) {
    return { ok: false, error: "Enter your email and password." };
  }
  if (!verifyCredentials(email, password)) {
    return { ok: false, error: "Incorrect email or password." };
  }
  await createSession();
  return { ok: true };
}

export async function signOutAction(): Promise<SignInResult> {
  await destroySession();
  return { ok: true };
}
