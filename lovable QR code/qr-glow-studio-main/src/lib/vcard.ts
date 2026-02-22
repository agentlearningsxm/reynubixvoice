export interface PhoneEntry {
  type: 'CELL' | 'WORK' | 'HOME' | 'FAX';
  value: string;
}

export interface EmailEntry {
  type: 'PERSONAL' | 'WORK' | 'OTHER';
  value: string;
}

export interface VCardData {
  firstName: string;
  lastName: string;
  organization: string;
  jobTitle: string;
  phones: PhoneEntry[];
  emails: EmailEntry[];
  websites: string[];
  street: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
  linkedin: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  voiceAgentUrl: string;
  note: string;
}

export const defaultVCardData: VCardData = {
  firstName: '',
  lastName: '',
  organization: '',
  jobTitle: '',
  phones: [{ type: 'CELL', value: '' }],
  emails: [{ type: 'WORK', value: '' }],
  websites: [''],
  street: '',
  city: '',
  state: '',
  zipcode: '',
  country: '',
  linkedin: '',
  instagram: '',
  twitter: '',
  tiktok: '',
  voiceAgentUrl: '',
  note: '',
};

export function generateVCardString(data: VCardData): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
  ];

  if (data.firstName || data.lastName) {
    lines.push(`N:${data.lastName};${data.firstName};;;`);
    lines.push(`FN:${data.firstName} ${data.lastName}`.trim());
  }

  if (data.organization) lines.push(`ORG:${data.organization}`);
  if (data.jobTitle) lines.push(`TITLE:${data.jobTitle}`);

  data.phones.forEach(p => {
    if (p.value) lines.push(`TEL;TYPE=${p.type}:${p.value}`);
  });

  data.emails.forEach(e => {
    if (e.value) {
      const typeMap = { PERSONAL: 'HOME', WORK: 'WORK', OTHER: 'OTHER' };
      lines.push(`EMAIL;TYPE=${typeMap[e.type]}:${e.value}`);
    }
  });

  data.websites.forEach(w => {
    if (w) lines.push(`URL:${w}`);
  });

  if (data.street || data.city || data.state || data.zipcode || data.country) {
    lines.push(`ADR;TYPE=WORK:;;${data.street};${data.city};${data.state};${data.zipcode};${data.country}`);
  }

  if (data.linkedin) lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${data.linkedin}`);
  if (data.instagram) lines.push(`X-SOCIALPROFILE;TYPE=instagram:${data.instagram}`);
  if (data.twitter) lines.push(`X-SOCIALPROFILE;TYPE=twitter:${data.twitter}`);
  if (data.tiktok) lines.push(`X-SOCIALPROFILE;TYPE=tiktok:${data.tiktok}`);
  if (data.voiceAgentUrl) lines.push(`URL;TYPE=VOICE-AI:${data.voiceAgentUrl}`);
  if (data.note) lines.push(`NOTE:${data.note}`);

  lines.push('END:VCARD');
  return lines.join('\n');
}
