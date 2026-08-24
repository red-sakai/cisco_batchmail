"use server";

import {
  SYSTEM_VARIANTS,
  getActiveEnv,
  getActiveProfileName,
  getEnvForVariant,
  getSystemVariant,
  listProfiles,
  setProfile,
  clearAllProfiles,
  setSystemVariant,
  type SystemVariant,
} from "@/lib/envStore";

const REQUIRED = ["SENDER_EMAIL", "SENDER_APP_PASSWORD", "SENDER_NAME"] as const;
const KEYS = ["SENDER_EMAIL", "SENDER_APP_PASSWORD", "SENDER_NAME"] as const;

type RequiredKey = typeof REQUIRED[number];

type EnvStatus = {
  ok: boolean;
  present: Record<RequiredKey, boolean>;
  missing: RequiredKey[];
  source: Record<RequiredKey, "profile" | "env" | "missing">;
  activeProfile: string | null;
  profiles: string[];
  systemVariant: SystemVariant;
  hint: string;
  example: string;
};

function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key) out[key] = val;
  });
  return out;
}

export async function getEnvStatusAction(variantParam?: string | null): Promise<EnvStatus> {
  const variant = (SYSTEM_VARIANTS as readonly string[]).includes(variantParam || "")
    ? (variantParam as SystemVariant)
    : getSystemVariant();
  const override = variant === "default" ? getActiveEnv() : getEnvForVariant(variant);
  const prefix = variant === "default" ? "" : variant.toUpperCase().replace(/-/g, "_");
  const present: Record<RequiredKey, boolean> = {
    SENDER_EMAIL: !!override.SENDER_EMAIL,
    SENDER_APP_PASSWORD: !!override.SENDER_APP_PASSWORD,
    SENDER_NAME: !!override.SENDER_NAME,
  };
  const missing = REQUIRED.filter((k) => !present[k]);
  const usingProfile = variant === "default" && !!getActiveProfileName();

  return {
    ok: missing.length === 0,
    present,
    missing,
    source: Object.fromEntries(
      REQUIRED.map((k) => [
        k,
        override[k] ? (usingProfile ? "profile" : "env") : "missing",
      ])
    ) as Record<RequiredKey, "profile" | "env" | "missing">,
    activeProfile: getActiveProfileName(),
    profiles: listProfiles(),
    systemVariant: variant,
    hint:
      variant === "default"
        ? "Create a .env.local file in the project root with SENDER_EMAIL, SENDER_APP_PASSWORD (e.g. Gmail App Password), and SENDER_NAME. Restart the server after changes."
        : `Set ${prefix}_SENDER_EMAIL, ${prefix}_SENDER_APP_PASSWORD, and ${prefix}_SENDER_NAME in your environment, then restart the server.`,
    example:
      variant === "default"
        ? "SENDER_EMAIL=you@example.com\nSENDER_APP_PASSWORD=abcd abcd abcd abcd\nSENDER_NAME=Your Name"
        : `${prefix}_SENDER_EMAIL=you@example.com\n${prefix}_SENDER_APP_PASSWORD=abcd abcd abcd abcd\n${prefix}_SENDER_NAME=Your Name`,
  };
}

export async function uploadEnvAction(input: FormData | { envText: string; profile?: string }) {
  let envText = "";
  let profileName = "";

  if (input instanceof FormData) {
    const file = input.get("file");
    const prof = input.get("profile");
    if (typeof prof === "string") profileName = prof;
    if (file instanceof File) {
      envText = await file.text();
      if (!profileName) {
        const fname = (file as File).name || "";
        const dot = fname.lastIndexOf(".");
        profileName = dot > 0 ? fname.slice(0, dot) : fname || "custom";
      }
    }
  } else {
    envText = input.envText || "";
    if (typeof input.profile === "string") profileName = input.profile;
    if (!profileName) profileName = "custom";
  }

  if (!envText.trim()) {
    return { ok: false, error: "No env content provided" } as const;
  }

  const parsed = parseEnv(envText);
  const extracted: Record<string, string> = {};
  KEYS.forEach((k) => {
    if (parsed[k]) extracted[k] = parsed[k];
  });
  setProfile(profileName, extracted);
  const missing = KEYS.filter((k) => !extracted[k]);
  return {
    ok: missing.length === 0,
    stored: extracted,
    missing,
    profile: profileName,
  };
}

export async function clearEnvAction() {
  clearAllProfiles();
  return { ok: true } as const;
}

export async function setVariantAction(variant: string) {
  const allowed = new Set([
    "default",
    "icpep",
    "cisco",
    "arduinodayph",
    "cyberph",
    "cyberph-noreply",
    "shaikah",
  ]);
  const normalized = typeof variant === "string" ? variant.toLowerCase() : "default";
  if (!allowed.has(normalized)) {
    return { ok: false, error: "Invalid variant" } as const;
  }
  setSystemVariant(
    normalized as
      | "default"
      | "icpep"
      | "cisco"
      | "arduinodayph"
      | "cyberph"
      | "cyberph-noreply"
      | "shaikah"
  );
  return { ok: true, variant: normalized } as const;
}
