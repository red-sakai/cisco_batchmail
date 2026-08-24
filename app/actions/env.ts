"use server";

import {
  DEFAULT_VARIANT,
  getEnvForVariant,
  type SystemVariant,
} from "@/lib/envStore";

const REQUIRED = ["SENDER_EMAIL", "SENDER_APP_PASSWORD", "SENDER_NAME"] as const;

type RequiredKey = typeof REQUIRED[number];

type EnvStatus = {
  ok: boolean;
  present: Record<RequiredKey, boolean>;
  missing: RequiredKey[];
  systemVariant: SystemVariant;
  hint: string;
  example: string;
};

export async function getEnvStatusAction(): Promise<EnvStatus> {
  const variant: SystemVariant = DEFAULT_VARIANT;
  const override = getEnvForVariant(variant);
  const prefix = variant.toUpperCase().replace(/-/g, "_");
  const present: Record<RequiredKey, boolean> = {
    SENDER_EMAIL: !!override.SENDER_EMAIL,
    SENDER_APP_PASSWORD: !!override.SENDER_APP_PASSWORD,
    SENDER_NAME: !!override.SENDER_NAME,
  };
  const missing = REQUIRED.filter((k) => !present[k]);

  return {
    ok: missing.length === 0,
    present,
    missing,
    systemVariant: variant,
    hint: `Set ${prefix}_SENDER_EMAIL, ${prefix}_SENDER_APP_PASSWORD, and ${prefix}_SENDER_NAME in your environment (or .env.local), then restart the server.`,
    example: `${prefix}_SENDER_EMAIL=you@example.com\n${prefix}_SENDER_APP_PASSWORD=abcd abcd abcd abcd\n${prefix}_SENDER_NAME=Cisco NetConnect PUP - Manila`,
  };
}
