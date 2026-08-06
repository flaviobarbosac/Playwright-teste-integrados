export function gerarCpfValido(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9));
  const digito = (nums: number[], fator: number) => {
    const soma = nums.reduce((acc, n, i) => acc + n * (fator - i), 0);
    const mod = soma % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const d1 = digito(base, 10);
  const d2 = digito([...base, d1], 11);
  const nums = [...base, d1, d2];
  return `${nums.slice(0, 3).join('')}.${nums.slice(3, 6).join('')}.${nums.slice(6, 9).join('')}-${nums.slice(9).join('')}`;
}
