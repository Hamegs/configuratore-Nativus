export function formatEur(value: number): string {
  return value.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €';
}
