import { createHash, randomBytes } from "node:crypto";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH = 12;
const INVITE_GROUP_SIZE = 4;

export function normalizeInviteCode(code: string) {
  return code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function formatInviteCode(code: string) {
  const normalized = normalizeInviteCode(code);
  const groups = normalized.match(new RegExp(`.{1,${INVITE_GROUP_SIZE}}`, "g"));
  return groups?.join("-") ?? normalized;
}

export function hashInviteCode(code: string) {
  return createHash("sha256").update(normalizeInviteCode(code)).digest("hex");
}

export function generateInviteCode() {
  const bytes = randomBytes(INVITE_CODE_LENGTH);
  let raw = "";

  for (let index = 0; index < INVITE_CODE_LENGTH; index += 1) {
    raw += INVITE_ALPHABET[bytes[index] % INVITE_ALPHABET.length];
  }

  return formatInviteCode(raw);
}
