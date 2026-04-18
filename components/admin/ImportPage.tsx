import { AlertCircle, CheckCircle, Database, Upload } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function ImportPage() {
  const [sheetId, setSheetId] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    rows_processed?: number;
    leads?: number;
    errors?: number;
  } | null>(null);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!sheetId) return;
    setImporting(true);
    setResult(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch('/api/import/google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sheetId, sheetName: sheetName || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult({ success: true, ...data });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setResult({ success: false, message });
    }
    setImporting(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Import from Google Sheets
        </h1>
        <p className="text-zinc-400">
          Migrate your existing Google Sheets data into the CRM
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <Database className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">
              Google Sheets Migration
            </h2>
            <p className="text-sm text-zinc-400">
              Enter your sheet ID to import leads
            </p>
          </div>
        </div>

        <form onSubmit={handleImport} className="space-y-4">
          <div>
            <label
              htmlFor="sheet-id"
              className="mb-2 block text-sm font-medium text-zinc-300"
            >
              Sheet ID
            </label>
            <input
              id="sheet-id"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Found in the Google Sheets URL: docs.google.com/spreadsheets/d/
              {'<SHEET_ID>'}/edit
            </p>
          </div>
          <div>
            <label
              htmlFor="sheet-name"
              className="mb-2 block text-sm font-medium text-zinc-300"
            >
              Sheet Name (optional)
            </label>
            <input
              id="sheet-name"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Sheet1"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={importing || !sheetId}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {importing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />{' '}
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> Import
              </>
            )}
          </button>
        </form>
      </div>

      {result && (
        <div
          className={`rounded-xl border p-4 ${result.success ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-red-500/20 bg-red-500/10'}`}
        >
          <div className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <p className="font-medium text-white">
              {result.success ? 'Import Complete' : 'Import Failed'}
            </p>
          </div>
          {result.success && (
            <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-zinc-400">Rows processed:</span>{' '}
                <span className="text-white">{result.rows_processed}</span>
              </div>
              <div>
                <span className="text-zinc-400">Leads imported:</span>{' '}
                <span className="text-emerald-400">{result.leads}</span>
              </div>
              <div>
                <span className="text-zinc-400">Errors:</span>{' '}
                <span
                  className={
                    result.errors ? 'text-red-400' : 'text-emerald-400'
                  }
                >
                  {result.errors || 0}
                </span>
              </div>
            </div>
          )}
          {!result.success && (
            <p className="mt-2 text-sm text-red-400">{result.message}</p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="mb-2 text-sm font-medium text-white">
          Before importing
        </h3>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex items-start gap-2">
            <span className="mt-1 text-emerald-500">1.</span> Ensure your Google
            Sheet has columns: email, name, company, phone, source, status
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 text-emerald-500">2.</span> Share the sheet
            with your Google service account email
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 text-emerald-500">3.</span> Add GOOGLE_API_KEY
            to your .env (for reading Google Sheets)
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 text-emerald-500">4.</span> Duplicate emails
            will be updated, not duplicated
          </li>
        </ul>
      </div>
    </div>
  );
}
