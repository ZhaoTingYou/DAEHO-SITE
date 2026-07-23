import nodemailer from 'nodemailer';

import {createEmailEvent} from './repositories';

type InquiryForEmail = {
  id: string;
  source: 'contact' | 'golf';
  locale: string;
  name: string;
  contact: string;
  email: string;
  organization: string;
  inquiryType: string;
  team: string;
  quantity: number | null;
  dueDate: string;
  useCase: string;
  message: string;
  configuration: unknown;
  pagePath: string;
  createdAt: string;
};

export async function notifyInquiry(inquiry: InquiryForEmail) {
  const config = getSmtpConfig();
  const subject = `[DAEHO] New ${inquiry.source === 'golf' ? 'Golf' : 'Contact'} inquiry`;

  if (!config) {
    createEmailEvent({
      inquiryId: inquiry.id,
      status: 'skipped',
      subject,
      errorMessage: 'SMTP is not configured.'
    });
    return {status: 'skipped' as const};
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user && config.pass ? {user: config.user, pass: config.pass} : undefined
    });
    const result = await transporter.sendMail({
      from: config.from,
      to: config.to,
      subject,
      text: renderInquiryText(inquiry),
      html: renderInquiryHtml(inquiry)
    });

    createEmailEvent({
      inquiryId: inquiry.id,
      recipient: config.to,
      subject,
      status: 'sent',
      providerMessageId: result.messageId
    });
    return {status: 'sent' as const, messageId: result.messageId};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error';
    createEmailEvent({
      inquiryId: inquiry.id,
      recipient: config.to,
      subject,
      status: 'failed',
      errorMessage: message
    });
    return {status: 'failed' as const, error: message};
  }
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const to = process.env.CMS_NOTIFY_TO;
  const from = process.env.SMTP_FROM;

  if (!host || !to || !from) {
    return null;
  }

  return {
    host,
    to,
    from,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  };
}

function renderInquiryText(inquiry: InquiryForEmail) {
  return [
    `Inquiry ID: ${inquiry.id}`,
    `Source: ${inquiry.source}`,
    `Locale: ${inquiry.locale}`,
    `Name: ${inquiry.name}`,
    `Contact: ${inquiry.contact}`,
    inquiry.email ? `Email: ${inquiry.email}` : '',
    inquiry.organization ? `Organization: ${inquiry.organization}` : '',
    inquiry.inquiryType ? `Type: ${inquiry.inquiryType}` : '',
    inquiry.team ? `Team: ${inquiry.team}` : '',
    inquiry.quantity ? `Quantity: ${inquiry.quantity}` : '',
    inquiry.dueDate ? `Due date: ${inquiry.dueDate}` : '',
    inquiry.useCase ? `Use: ${inquiry.useCase}` : '',
    `Page: ${inquiry.pagePath}`,
    `Created: ${inquiry.createdAt}`,
    '',
    'Configuration:',
    JSON.stringify(inquiry.configuration, null, 2),
    '',
    'Message:',
    inquiry.message || '(empty)'
  ]
    .filter(Boolean)
    .join('\n');
}

function renderInquiryHtml(inquiry: InquiryForEmail) {
  const rows = [
    ['Inquiry ID', inquiry.id],
    ['Source', inquiry.source],
    ['Locale', inquiry.locale],
    ['Name', inquiry.name],
    ['Contact', inquiry.contact],
    ['Email', inquiry.email],
    ['Organization', inquiry.organization],
    ['Type', inquiry.inquiryType],
    ['Team', inquiry.team],
    ['Quantity', inquiry.quantity?.toString() ?? ''],
    ['Due date', inquiry.dueDate],
    ['Use', inquiry.useCase],
    ['Page', inquiry.pagePath],
    ['Created', inquiry.createdAt]
  ].filter(([, value]) => value);

  return `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
      <h2 style="margin:0 0 16px">New DAEHO inquiry</h2>
      <table style="border-collapse:collapse;width:100%;max-width:720px">
        ${rows
          .map(
            ([label, value]) => `
              <tr>
                <th style="border:1px solid #e5e7eb;padding:8px;text-align:left;background:#f9fafb;width:160px">${escapeHtml(label)}</th>
                <td style="border:1px solid #e5e7eb;padding:8px">${escapeHtml(value)}</td>
              </tr>
            `
          )
          .join('')}
      </table>
      <h3 style="margin:24px 0 8px">Configuration</h3>
      <pre style="background:#f9fafb;border:1px solid #e5e7eb;padding:12px;white-space:pre-wrap">${escapeHtml(
        JSON.stringify(inquiry.configuration, null, 2)
      )}</pre>
      <h3 style="margin:24px 0 8px">Message</h3>
      <p style="white-space:pre-wrap">${escapeHtml(inquiry.message || '(empty)')}</p>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
