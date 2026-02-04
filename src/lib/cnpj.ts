export function isCnpjRepeatedDigits(cnpjDigits: string) {
  const d = (cnpjDigits ?? "").replace(/\D/g, "");
  if (d.length !== 14) return false;
  return /^(\d)\1{13}$/.test(d);
}

function calcDv(base: string, weights: number[]) {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += Number(base[i]) * weights[i];
  }
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

export function isValidCnpj(cnpjDigits: string) {
  const d = (cnpjDigits ?? "").replace(/\D/g, "");
  if (d.length !== 14) return false;
  if (isCnpjRepeatedDigits(d)) return false;

  const base12 = d.slice(0, 12);
  const dv1 = calcDv(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const base13 = base12 + String(dv1);
  const dv2 = calcDv(base13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return d === base12 + String(dv1) + String(dv2);
}