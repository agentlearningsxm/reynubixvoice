import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import type { ContactSubmitPayload } from '../lib/telemetry/shared';
import { normalizeEmail } from '../lib/telemetry/shared';
import {
  attachLeadToSession,
  ensureTrackingEntities,
  recordEvent,
  upsertLead,
} from './_lib/telemetry';
import { readJsonBody, rejectMethod } from './_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectMethod(req, res)) {
    return;
  }

  const payload = readJsonBody<ContactSubmitPayload>(req);
  const { context, name, email, company, message } = payload;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const safeEmail = normalizeEmail(email);
  const { supabase, sessionDbId } = await ensureTrackingEntities(req, context);
  const leadId = await upsertLead({
    email: safeEmail,
    name,
    company,
    source: 'contact_form',
    metadata: {
      pagePath: context?.pagePath ?? null,
    },
  });
  await attachLeadToSession(leadId, sessionDbId);

  const { error: submissionError } = await supabase.from('contact_submissions').insert({
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
      text: `Name: ${name}\nEmail: ${safeEmail}\nCompany: ${company || 'N/A'}\n\n${message}`,
      html: `<p><strong>Name:</strong> ${name}</p>
             <p><strong>Email:</strong> ${safeEmail}</p>
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
    await supabase
      .from('contact_submissions')
      .update({ delivery_status: 'failed', status: 'error' })
      .eq('lead_id', leadId)
      .eq('session_id', sessionDbId);

    throw error;
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

  return res.status(200).json({ success: true, leadId });
}
