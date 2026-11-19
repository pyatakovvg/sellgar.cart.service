export function multiplyPrice(value: string, quantity: number): string {
  const match = /^(\d+)\.(\d{2})$/.exec(value);
  if (!match || !Number.isSafeInteger(quantity) || quantity < 0) throw new Error('Invalid monetary input');
  return formatMinor((BigInt(match[1]) * 100n + BigInt(match[2])) * BigInt(quantity));
}

export function sumPrices(values: string[]): string {
  return formatMinor(values.reduce((sum, value) => sum + BigInt(value.replace('.', '')), 0n));
}

function formatMinor(value: bigint): string {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
}
