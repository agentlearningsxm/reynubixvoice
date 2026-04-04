import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const { sheetId, sheetName } = req.body;
  if (!sheetId) return res.status(400).json({ error: 'sheetId required' });

  const supabase = getSupabaseAdmin();
  const imported = { leads: 0, errors: 0 };

  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey)
      return res.status(500).json({ error: 'Google API key not configured' });

    const range = sheetName ? `${sheetName}!A:Z` : 'A:Z';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const err = await response.json();
      return res
        .status(response.status)
        .json({ error: err.error?.message || 'Failed to read sheet' });
    }

    const data = await response.json();
    const rows = data.values || [];
    if (rows.length < 2)
      return res.json({
        message: 'No data rows found',
        rows_processed: 0,
        ...imported,
      });

    const headers = rows[0].map((h: string) => h.toLowerCase().trim());
    const emailIdx = headers.findIndex((h: string) => h.includes('email'));
    const nameIdx = headers.findIndex(
      (h: string) => h.includes('name') && !h.includes('company'),
    );
    const companyIdx = headers.findIndex((h: string) => h.includes('company'));
    const phoneIdx = headers.findIndex((h: string) => h.includes('phone'));
    const sourceIdx = headers.findIndex((h: string) => h.includes('source'));
    const statusIdx = headers.findIndex((h: string) => h.includes('status'));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const email = emailIdx >= 0 ? row[emailIdx] : null;
      if (!email) {
        imported.errors++;
        continue;
      }

      const leadData = {
        email,
        email_normalized: email.toLowerCase().trim(),
        name: nameIdx >= 0 ? row[nameIdx] || null : null,
        company: companyIdx >= 0 ? row[companyIdx] || null : null,
        phone: phoneIdx >= 0 ? row[phoneIdx] || null : null,
        source:
          sourceIdx >= 0 ? row[sourceIdx] || 'google_sheets' : 'google_sheets',
        status: statusIdx >= 0 ? row[statusIdx] || 'new' : 'new',
        metadata: { imported_from_sheets: true, sheet_id: sheetId },
      };

      const { error: upsertError } = await supabase
        .from('leads')
        .upsert(leadData, { onConflict: 'email_normalized' });

      if (!upsertError) imported.leads++;
      else imported.errors++;
    }

    await supabase.from('crm_audit_log').insert({
      actor_id: user.id,
      action: 'import_google_sheets',
      entity_type: 'leads',
      entity_id: '00000000-0000-0000-0000-000000000000',
      changes: {
        sheet_id: sheetId,
        rows_processed: rows.length - 1,
        ...imported,
      },
    });

    return res.json({
      message: 'Import complete',
      rows_processed: rows.length - 1,
      ...imported,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Import failed';
    return res.status(500).json({ error: message });
  }
}
