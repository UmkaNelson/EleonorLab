/**
 * Cloudflare Worker endpoint for website forms -> Telegram.
 * Keep TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID only in Worker secrets.
 */

const DEFAULT_ALLOWED_METHODS = 'POST,OPTIONS';
const DEFAULT_ALLOWED_HEADERS = 'Content-Type';

function readAllowedOrigins(env) {
  const raw = (env.ALLOWED_ORIGINS || '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = readAllowedOrigins(env);

  if (!origin) return '*';
  if (!allowed.length) return origin;
  if (allowed.includes('*')) return origin;
  if (allowed.includes(origin)) return origin;
  return '';
}

function corsHeaders(request, env) {
  const allowOrigin = resolveOrigin(request, env);
  return {
    'Access-Control-Allow-Origin': allowOrigin || 'null',
    'Access-Control-Allow-Methods': DEFAULT_ALLOWED_METHODS,
    'Access-Control-Allow-Headers': DEFAULT_ALLOWED_HEADERS,
    Vary: 'Origin'
  };
}

function jsonResponse(request, env, payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request, env)
    }
  });
}

function stringifyFieldValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeText(value) {
  return stringifyFieldValue(value).replace(/\s+/g, ' ').trim();
}

function humanizeSource(source) {
  const value = normalizeText(source);
  const map = {
    contacts_page: 'Страница контактов',
    homepage_contact_cta: 'Страница контактов',
    tour_signup: 'Спецпроект',
    website_form: 'Форма сайта',
    manual_test: 'Тестовая отправка'
  };
  return map[value] || value || 'Форма сайта';
}

function getMoscowDateTimeParts(rawDate) {
  const dateObject = rawDate ? new Date(rawDate) : new Date();
  const safeDate = Number.isNaN(dateObject.getTime()) ? new Date() : dateObject;

  const formatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(safeDate);
  const byType = {};
  parts.forEach((part) => {
    byType[part.type] = part.value;
  });

  return {
    date: `${byType.day || '--'}.${byType.month || '--'}.${byType.year || '----'}`,
    time: `${byType.hour || '--'}:${byType.minute || '--'}:${byType.second || '--'}`
  };
}

function getField(body, key) {
  const fields = body.fields && typeof body.fields === 'object' ? body.fields : {};
  return normalizeText(fields[key] || '');
}

function buildHomepageCtaText(body, attachmentName) {
  const dateTime = getMoscowDateTimeParts(body.submitted_at);
  const lines = [];
  lines.push('Новая заявка с сайта');
  lines.push('');
  lines.push(`Тип формы: ${humanizeSource(body.source || 'website_form')}`);
  lines.push(`Страница: ${normalizeText(body.page_url || '')}`);
  lines.push('');
  lines.push(`Дата: ${dateTime.date}`);
  lines.push(`Время: ${dateTime.time} (по Московскому времени)`);
  lines.push('');
  lines.push('Данные формы:');
  lines.push(`- Имя: ${getField(body, 'name')}`);
  lines.push(`- Телефон: ${getField(body, 'phone')}`);
  lines.push(`- Почта: ${getField(body, 'email')}`);
  lines.push(`- Компания: ${getField(body, 'company')}`);
  if (attachmentName) {
    lines.push(`- Файл: ${attachmentName}`);
  }
  return lines.join('\n');
}

function buildDefaultText(body, attachmentName) {
  const dateTime = getMoscowDateTimeParts(body.submitted_at);
  const lines = [];
  lines.push('Новая заявка с сайта');
  lines.push('');
  lines.push(`Тип формы: ${humanizeSource(body.source || 'website_form')}`);
  lines.push(`Страница: ${normalizeText(body.page_url || '')}`);
  lines.push('');
  lines.push(`Дата: ${dateTime.date}`);
  lines.push(`Время: ${dateTime.time} (по Московскому времени)`);
  lines.push('');
  lines.push('Данные формы:');
  lines.push(`- Имя: ${getField(body, 'name')}`);
  lines.push(`- Телефон: ${getField(body, 'phone')}`);
  lines.push(`- Сообщение: ${getField(body, 'message')}`);
  if (attachmentName) {
    lines.push(`- Файл: ${attachmentName}`);
  }
  return lines.join('\n');
}

function buildTelegramText(body, attachmentName) {
  const source = normalizeText(body?.source || '');
  if (source === 'homepage_contact_cta') {
    return buildHomepageCtaText(body || {}, attachmentName);
  }
  return buildDefaultText(body || {}, attachmentName);
}

async function parseBody(request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const payloadRaw = formData.get('payload');
    let body = {};

    let payloadText = '';
    if (typeof payloadRaw === 'string') {
      payloadText = payloadRaw;
    } else if (payloadRaw && typeof payloadRaw === 'object' && typeof payloadRaw.text === 'function') {
      payloadText = await payloadRaw.text();
    }

    if (payloadText.trim()) {
      body = JSON.parse(payloadText);
    }

    const fileCandidate = formData.get('attachment');
    const attachment =
      fileCandidate &&
      typeof fileCandidate === 'object' &&
      typeof fileCandidate.arrayBuffer === 'function' &&
      Number(fileCandidate.size || 0) > 0
        ? fileCandidate
        : null;

    return { body, attachment };
  }

  const body = await request.json();
  return { body, attachment: null };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env)
      });
    }

    if (request.method !== 'POST') {
      return jsonResponse(request, env, { ok: false, error: 'Method Not Allowed' }, 405);
    }

    const url = new URL(request.url);
    const isSupportedPath = url.pathname === '/submit' || url.pathname.endsWith('/submit');
    if (!isSupportedPath) {
      return jsonResponse(request, env, { ok: false, error: 'Not Found' }, 404);
    }

    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return jsonResponse(request, env, { ok: false, error: 'Worker secrets are not configured' }, 500);
    }

    let parsed;
    try {
      parsed = await parseBody(request);
    } catch {
      return jsonResponse(request, env, { ok: false, error: 'Invalid payload' }, 400);
    }

    const body = parsed?.body || {};
    const attachment = parsed?.attachment || null;
    const attachmentName = attachment?.name ? normalizeText(attachment.name) : '';

    const text = buildTelegramText(body, attachmentName);
    const telegramResponse = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        disable_web_page_preview: true
      })
    });

    if (!telegramResponse.ok) {
      const raw = await telegramResponse.text();
      return jsonResponse(
        request,
        env,
        { ok: false, error: 'Telegram sendMessage failed', details: raw.slice(0, 500) },
        502
      );
    }

    if (attachment) {
      const tgForm = new FormData();
      tgForm.append('chat_id', env.TELEGRAM_CHAT_ID);
      tgForm.append('caption', `Файл к заявке: ${attachmentName || 'attachment'}`);
      tgForm.append('document', attachment, attachmentName || 'attachment');

      const fileResponse = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        body: tgForm
      });

      if (!fileResponse.ok) {
        const raw = await fileResponse.text();
        return jsonResponse(
          request,
          env,
          { ok: false, error: 'Telegram sendDocument failed', details: raw.slice(0, 500) },
          502
        );
      }
    }

    return jsonResponse(request, env, { ok: true });
  }
};
