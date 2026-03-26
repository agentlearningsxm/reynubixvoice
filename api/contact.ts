import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import type { ContactSubmitPayload } from '../lib/telemetry/shared.js';
import { normalizeEmail } from '../lib/telemetry/shared.js';
import { getClientIp, readJsonBody, rejectMethod } from './_lib/http.js';
import { checkRateLimit } from './_lib/rate-limit.js';
import {
  attachLeadToSession,
  ensureTrackingEntities,
  recordEvent,
  upsertLead,
} from './_lib/telemetry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    return await _handler(req, res);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[contact] unhandled error:', msg, err);
    return res.status(500).json({ error: msg });
  }
}

async function _handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) {
    return;
  }

  // Rate limit: 5 requests per 60 seconds per IP
  const ip = getClientIp(req);
  const { allowed, retryAfterMs } = checkRateLimit(ip, 60_000, 5);
  if (!allowed) {
    const retryAfterSec = Math.ceil((retryAfterMs ?? 0) / 1000);
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(429).json({ error: 'Too many requests', retryAfter: retryAfterSec });
  }

  const payload = readJsonBody<ContactSubmitPayload>(req);
  const { context, name, email, phone, company, message } = payload;

  if (!name || !email || !phone || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const safeEmail = normalizeEmail(email);
  const { supabase, sessionDbId } = await ensureTrackingEntities(req, context);
  const leadId = await upsertLead({
    email: safeEmail,
    name,
    phone,
    company,
    source: 'contact_form',
    metadata: {
      pagePath: context?.pagePath ?? null,
    },
  });
  await attachLeadToSession(leadId, sessionDbId);

  const { error: submissionError } = await supabase
    .from('contact_submissions')
    .insert({
      lead_id: leadId,
      session_id: sessionDbId,
      name: name.trim(),
      email: safeEmail,
      company: company?.trim() || null,
      message: message.trim(),
      status: 'received',
      delivery_status: 'pending',
      metadata: {
        context,
        phone: phone.trim(),
      },
    });

  if (submissionError) {
    console.error('Failed to persist contact submission', submissionError);
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_EMAIL,
      pass: process.env.ZOHO_APP_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Reynubix Contact Form" <${process.env.ZOHO_EMAIL}>`,
      to: 'voice@reynubix.com',
      replyTo: safeEmail,
      subject: `New Inquiry from ${name}${company ? ` (${company})` : ''}`,
      text: `Name: ${name}\nEmail: ${safeEmail}\nPhone: ${phone}\nCompany: ${company || 'N/A'}\n\n${message}`,
      html: `<p><strong>Name:</strong> ${name}</p>
             <p><strong>Email:</strong> ${safeEmail}</p>
             <p><strong>Phone:</strong> ${phone}</p>
             <p><strong>Company:</strong> ${company || 'N/A'}</p>
             <hr>
             <p>${message.replace(/\n/g, '<br>')}</p>`,
    });

    await supabase
      .from('contact_submissions')
      .update({ delivery_status: 'sent' })
      .eq('lead_id', leadId)
      .eq('session_id', sessionDbId);
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : JSON.stringify(error);
    console.error('[contact] email send failed (non-fatal):', errMsg);
    await supabase
      .from('contact_submissions')
      .update({ delivery_status: 'failed' })
      .eq('lead_id', leadId)
      .eq('session_id', sessionDbId);
    // Email failure must never block form submission -lead is already saved
  }

  await recordEvent({
    req,
    eventName: 'contact_form_submitted',
    context: {
      ...context,
      leadId,
    },
    leadId,
    properties: {
      company: company?.trim() || null,
      emailDomain: safeEmail.split('@')[1] || null,
      messageLength: message.trim().length,
    },
  });

  // Fire n8n webhook -never block the form response
  if (process.env.N8N_WEBHOOK_URL) {
    try {
      await fetch(process.env.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: safeEmail,
          phone: phone.trim(),
          company: company?.trim() || null,
          message: message.trim(),
          leadId,
          source: 'contact_form',
        }),
      });
    } catch (err) {
      console.error('[n8n webhook] failed to notify:', err);
      // never rethrow -form submission must succeed regardless
    }
  }

  return res.status(200).json({ success: true, leadId });
}
