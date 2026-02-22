export interface QRVCardData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  company: string;
  title: string;
  website: string;
  linkedin: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  address: string;
  note: string;
}

function esc(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function pushIf(lines: string[], key: string, value: string) {
  const trimmed = value?.trim();
  if (!trimmed) return;
  lines.push(`${key}:${esc(trimmed)}`);
}

export function buildVCardString(data: QRVCardData): string {
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];

  const first = data.firstName?.trim() ?? '';
  const last = data.lastName?.trim() ?? '';
  lines.push(`N:${esc(last)};${esc(first)};;;`);

  const fn = `${first} ${last}`.trim();
  if (fn) {
    lines.push(`FN:${esc(fn)}`);
  }

  pushIf(lines, 'ORG', data.company);
  pushIf(lines, 'TITLE', data.title);
  pushIf(lines, 'TEL;TYPE=CELL', data.phone);
  pushIf(lines, 'EMAIL;TYPE=INTERNET', data.email);
  pushIf(lines, 'ADR;TYPE=WORK', data.address);
  pushIf(lines, 'NOTE', data.note);

  const urls = [data.website, data.linkedin, data.instagram, data.twitter, data.tiktok]
    .map((item) => item?.trim())
    .filter(Boolean) as string[];

  urls.forEach((url) => lines.push(`URL:${esc(url)}`));

  lines.push('END:VCARD');
  return lines.join('\n');
}
