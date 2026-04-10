"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";

const registerSchema = z.object({
  displayName: z.string().min(2, "Le nom doit faire au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
});

export async function register(formData: FormData) {
  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { displayName, email, password } = parsed.data;

  // Check if email already exists
  const existing = await prisma.profiles.findFirst({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    return { success: false, error: "Cet email est déjà utilisé" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.profiles.create({
    data: {
      display_name: displayName,
      email: email.toLowerCase(),
      password_hash: passwordHash,
    },
  });

  // Auto sign-in after registration
  await signIn("credentials", {
    email: email.toLowerCase(),
    password,
    redirect: false,
  });

  return { success: true };
}
