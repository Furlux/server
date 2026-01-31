import crypto from 'node:crypto';

type TelegramAuthConfig = {
  enabled?: boolean;
  publicRoutes?: string[];
};

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;
const WEB_APP_DATA_KEY = 'Web' + 'App' + 'Data'; // Telegram-defined HMAC key

const normalizePath = (value: string) => {
  if (value.length > 1 && value.endsWith('/')) {
    return value.slice(0, -1);
  }
  return value;
};

const isPublicRoute = (path: string, publicRoutes: string[]) => {
  const normalizedPath = normalizePath(path);

  return publicRoutes.some((route) => {
    if (!route) {
      return false;
    }

    const normalizedRoute = normalizePath(route);
    return (
      normalizedPath === normalizedRoute ||
      normalizedPath.startsWith(`${normalizedRoute}/`)
    );
  });
};

const buildDataCheckString = (params: URLSearchParams) => {
  const pairs: Array<{ key: string; value: string }> = [];

  for (const [key, value] of params.entries()) {
    pairs.push({ key, value });
  }

  pairs.sort((a, b) => a.key.localeCompare(b.key));
  return pairs.map((pair) => `${pair.key}=${pair.value}`).join('\n');
};

const calculateHash = (dataCheckString: string, botToken: string) => {
  const secret = crypto
    .createHmac('sha256', WEB_APP_DATA_KEY)
    .update(botToken)
    .digest();

  return crypto
    .createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');
};

const safeCompareHex = (left: string, right: string) => {
  if (left.length !== right.length) {
    return false;
  }

  try {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
  } catch {
    return false;
  }
};

const parseJsonValue = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const parseTelegramData = (params: URLSearchParams) => {
  const data: Record<string, unknown> = {};

  for (const [key, value] of params.entries()) {
    if (key === 'auth_date') {
      const parsed = Number(value);
      data[key] = Number.isNaN(parsed) ? value : parsed;
      continue;
    }

    if (key === 'user' || key === 'receiver' || key === 'chat') {
      data[key] = parseJsonValue(value);
      continue;
    }

    data[key] = value;
  }

  return data;
};

// This middleware validates Telegram Web App initData.
const telegramAuth = (
  config: TelegramAuthConfig | undefined,
  { strapi }: { strapi: unknown }
) => {
  const resolvedConfig = config ?? {};
  const enabled = resolvedConfig.enabled !== false;
  const publicRoutes = Array.isArray(resolvedConfig.publicRoutes)
    ? resolvedConfig.publicRoutes
    : [];

  return async (ctx: any, next: () => Promise<unknown>) => {
    if (!enabled) {
      await next();
      return;
    }

    const requestPath = ctx.request.path ?? '';

    if (!requestPath.startsWith('/api')) {
      await next();
      return;
    }

    if (isPublicRoute(requestPath, publicRoutes)) {
      await next();
      return;
    }

    const initData = ctx.get('x-telegram-init-data');

    if (!initData) {
      ctx.status = 401;
      ctx.body = { error: 'Missing Telegram initData' };
      return;
    }

    const botToken = process.env.TG_BOT_TOKEN;

    if (!botToken) {
      ctx.status = 500;
      ctx.body = { error: 'Telegram auth misconfigured' };
      return;
    }

    const params = new URLSearchParams(initData);
    const receivedHash = params.get('hash');

    if (!receivedHash) {
      ctx.status = 401;
      ctx.body = { error: 'Invalid Telegram initData' };
      return;
    }

    params.delete('hash');

    const dataCheckString = buildDataCheckString(params);
    const calculatedHash = calculateHash(dataCheckString, botToken);

    if (!safeCompareHex(receivedHash, calculatedHash)) {
      ctx.status = 401;
      ctx.body = { error: 'Invalid Telegram initData' };
      return;
    }

    const authDateRaw = params.get('auth_date');
    const authDate = authDateRaw ? Number(authDateRaw) : Number.NaN;

    if (!authDateRaw || Number.isNaN(authDate)) {
      ctx.status = 401;
      ctx.body = { error: 'Invalid Telegram auth_date' };
      return;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);

    if (nowSeconds - authDate > MAX_AUTH_AGE_SECONDS) {
      ctx.status = 401;
      ctx.body = { error: 'Telegram initData expired' };
      return;
    }

    ctx.state.telegram = parseTelegramData(params);
    await next();
  };
};

export default telegramAuth;
