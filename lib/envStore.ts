type EnvMap = {
  SENDER_EMAIL?: string;
  SENDER_APP_PASSWORD?: string;
  SENDER_NAME?: string;
};

export const SYSTEM_VARIANTS = ["cisco"] as const;

export type SystemVariant = (typeof SYSTEM_VARIANTS)[number];

export const DEFAULT_VARIANT: SystemVariant = "cisco";

const readEnv = (key: string) => {
  const raw = process.env[key];
  if (raw === undefined || raw === null) return undefined;
  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
};

const readEnvAny = (...keys: string[]) => {
  for (const key of keys) {
    const value = readEnv(key);
    if (value !== undefined) return value;
  }
  return undefined;
};

const readPrefixedEnv = (prefix: string, suffix: string) =>
  readEnvAny(
    `${prefix}_${suffix}`,
    `${prefix.toLowerCase()}_${suffix.toLowerCase()}`
  );

const readPassword = (prefix: string) =>
  readEnvAny(
    `${prefix}_SENDER_APP_PASSWORD`,
    `${prefix}_SENDER_PASSWORD`,
    `${prefix.toLowerCase()}_sender_app_password`,
    `${prefix.toLowerCase()}_sender_password`
  );

export function getEnvForVariant(variant: SystemVariant): EnvMap {
  switch (variant) {
    case "cisco":
      return {
        SENDER_EMAIL: readPrefixedEnv("CISCO", "SENDER_EMAIL"),
        SENDER_APP_PASSWORD: readPassword("CISCO"),
        SENDER_NAME: readPrefixedEnv("CISCO", "SENDER_NAME"),
      };
    default:
      return {};
  }
}
