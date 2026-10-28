import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/** Hache un mot de passe avec bcrypt. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Vérifie un mot de passe contre son hachage. */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Valide la force d'un mot de passe (min 8 caractères, au moins une majuscule, un chiffre). */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (!/[A-Z]/.test(password)) return "Le mot de passe doit contenir au moins une majuscule.";
  if (!/[0-9]/.test(password)) return "Le mot de passe doit contenir au moins un chiffre.";
  return null;
}