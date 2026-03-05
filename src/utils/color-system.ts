/**
 * Detects the color system from a raw color code.
 *
 * NCS pattern  → "S0502-Y50R", "0502-Y50R", "0500-N"
 * RAL pattern  → "1001", "7016", "9010" (3–4 digit numbers only)
 * NATURAL      → everything else (NATURAL 24 CENERE N1, etc.)
 */
export function detectColorSystem(code: string): 'RAL' | 'NCS' | 'NATURAL' {
  if (!code) return 'NATURAL';
  const c = code.trim();
  // NCS: optional "S" + 4 digits + dash + alphanumeric suffix
  if (/^S?\d{4}-[A-Z0-9]+/.test(c)) return 'NCS';
  // RAL: exactly 3–4 digits (no letters)
  if (/^\d{3,4}$/.test(c)) return 'RAL';
  return 'NATURAL';
}

/**
 * Formats a color code with its detected system prefix.
 *
 * Examples
 *   "1004"            → "RAL 1004"
 *   "S0502-Y50R"      → "NCS S0502-Y50R"
 *   "CENERE N1"       → "CENERE N1"   (NATURAL codes returned as-is)
 */
export function formatColorLabel(code: string | undefined | null): string {
  if (!code) return '';
  const system = detectColorSystem(code);
  if (system === 'NATURAL') return code;
  return `${system} ${code}`;
}
