export function validatePassword(pw: string) {
  const value = String(pw ?? "");

  const errors: string[] = [];
  if (value.length < 8) errors.push("mínimo de 8 caracteres");
  if (!/[a-z]/.test(value)) errors.push("ao menos 1 letra minúscula");
  if (!/[A-Z]/.test(value)) errors.push("ao menos 1 letra maiúscula");
  if (!/[^A-Za-z0-9]/.test(value)) errors.push("ao menos 1 caractere especial");

  return { ok: errors.length === 0, errors };
}