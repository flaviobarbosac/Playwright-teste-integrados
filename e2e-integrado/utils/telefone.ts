export function parseTelefoneBr(raw?: string): { ddd: string; telefone: string } {
  const digits = raw?.replace(/\D/g, '') ?? '';
  if (digits.length >= 10) {
    return { ddd: digits.slice(0, 2), telefone: digits.slice(2) };
  }
  return { ddd: '', telefone: digits };
}
