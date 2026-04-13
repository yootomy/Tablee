"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { ensureOperationalSchema } from "@/lib/app-schema";
import { assertRateLimit, RateLimitExceededError } from "@/lib/rate-limit";
import {
  getClientIpFromCurrentRequest,
  normalizeEmailAddress,
} from "@/lib/request-context";

const registerSchema = z.object({
  displayName: z.string().min(2, "Le nom doit faire au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
});

export async function register(formData: FormData) {
  await ensureOperationalSchema();

  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { displayName, email, password } = parsed.data;
  const normalizedEmail = normalizeEmailAddress(email);
  const clientIp = await getClientIpFromCurrentRequest();

  try {
    await Promise.all([
      assertRateLimit({
        scope: "auth-register:ip",
        identifier: clientIp,
        limit: Number(process.env.AUTH_REGISTER_IP_LIMIT ?? 10),
        windowMs: 60 * 60 * 1000,
        message:
          "Trop de créations de compte depuis cette connexion. Réessaie un peu plus tard.",
      }),
      assertRateLimit({
        scope: "auth-register:email",
        identifier: normalizedEmail,
        limit: Number(process.env.AUTH_REGISTER_EMAIL_LIMIT ?? 5),
        windowMs: 24 * 60 * 60 * 1000,
        message:
          "Cet email a déjà été tenté plusieurs fois aujourd'hui. Réessaie demain ou utilise la connexion.",
      }),
    ]);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { success: false, error: error.message };
    }

    throw error;
  }

  // Check if email already exists
  const existing = await prisma.profiles.findFirst({
    where: { email: normalizedEmail },
  });

  if (existing) {
    return { success: false, error: "Cet email est déjà utilisé" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await prisma.profiles.create({
      data: {
        display_name: displayName,
        email: normalizedEmail,
        password_hash: passwordHash,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("idx_profiles_email") ||
        error.message.toLowerCase().includes("unique"))
    ) {
      return { success: false, error: "Cet email est déjà utilisé" };
    }

    throw error;
  }

  // Auto sign-in after registration
  await signIn("credentials", {
    email: normalizedEmail,
    password,
    redirect: false,
  });

  return { success: true };
}
