/**
 * Parse pasted text or file contents into a list of student names.
 * Auto-detects whether the input is newline-, comma-, semicolon-, or tab-separated.
 * Strips quotes, blank lines, and a leading "name" header if present.
 */
export function parseStudentNames(text: string): string[] {
  if (!text) return [];
  // Try newlines first; if there's only one line, fall back to delimiters.
  let parts: string[] = [];
  if (text.includes('\n')) {
    parts = text.split(/\r?\n/);
  } else if (text.includes(',')) {
    parts = text.split(',');
  } else if (text.includes(';')) {
    parts = text.split(';');
  } else if (text.includes('\t')) {
    parts = text.split('\t');
  } else {
    parts = [text];
  }

  const names = parts
    .map((p) => p.replace(/^["']+|["']+$/g, '').trim())
    // Drop CSV-like rows by taking the first column when commas are present.
    .map((p) => (p.includes(',') ? (p.split(',')[0] ?? '').trim() : p))
    .filter(Boolean);

  // Drop a header row if it's literally "name".
  if (names.length > 0 && /^name(s)?$/i.test(names[0])) names.shift();

  // De-dupe (case-insensitive) preserving first occurrence.
  const seen = new Set<string>();
  return names.filter((n) => {
    const k = n.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function toCSV(names: string[]): string {
  return ['name', ...names.map((n) => /[",\n]/.test(n) ? `"${n.replace(/"/g, '""')}"` : n)].join('\n');
}
