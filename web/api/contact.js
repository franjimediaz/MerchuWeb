import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      name,
      email,
      subject,
      message,
      date,
      time,
      service,
      honeypot
    } = body;

    // Anti-spam
    if (honeypot) return res.status(200).json({ ok: true });

    // Validación mínima obligatoria: debe tener al menos un nombre o mensaje
    if (!name && !message) {
      return res.status(400).json({ error: 'Faltan datos para procesar la solicitud' });
    }

    // Construir mensaje completo aunque falten campos
    const msg = `
${message ? message : ''}
${service ? `\nServicio: ${service}` : ''}
${date ? `\nFecha: ${date}` : ''}
${time ? `\nHora: ${time}` : ''}
${email ? `\nEmail de contacto: ${email}` : ''}
`.trim();

    if (msg.length > 4000) {
      return res.status(400).json({ error: 'Mensaje demasiado largo' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'onboarding@resend.dev', // cámbialo por tu remitente verificado
      to: ['franjimenezdiaz98@gmail.com'], // destino real
      ...(email ? { reply_to: email } : {}), // sólo añade reply_to si hay email
      subject: subject?.trim() || `Nuevo mensaje de ${name || 'Formulario Web'}`,
      html: `
        <h2>Nueva solicitud desde el formulario web</h2>
        <table border="0" cellpadding="6" cellspacing="0" style="border-collapse:collapse; font-family:Arial, sans-serif; font-size:14px;">
          ${name ? `<tr><td><strong>Nombre</strong></td><td>${escapeHtml(name)}</td></tr>` : ''}
          ${email ? `<tr><td><strong>Email</strong></td><td>${escapeHtml(email)}</td></tr>` : ''}
          ${service ? `<tr><td><strong>Servicio</strong></td><td>${escapeHtml(service)}</td></tr>` : ''}
          ${date ? `<tr><td><strong>Fecha</strong></td><td>${escapeHtml(date)}</td></tr>` : ''}
          ${time ? `<tr><td><strong>Hora</strong></td><td>${escapeHtml(time)}</td></tr>` : ''}
          ${subject ? `<tr><td><strong>Asunto</strong></td><td>${escapeHtml(subject)}</td></tr>` : ''}
        </table>
        ${message ? `<hr style="margin:16px 0;border:none;border-top:1px solid #eee;"><p style="white-space:pre-wrap;">${escapeHtml(message)}</p>` : ''}
      `
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'No se pudo enviar el correo' });
  }
}

// Saneado básico
function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
