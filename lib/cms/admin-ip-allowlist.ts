type HeaderReader = {
  get(name: string): string | null;
};

type AllowedIpRule =
  | {
      type: 'ipv4';
      address: number;
      mask: number;
    }
  | {
      type: 'exact';
      ip: string;
    };

export function isAdminProtectedPath(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/api/admin' || pathname.startsWith('/api/admin/');
}

export function isAdminIpAllowed(headers: HeaderReader, allowedIpsConfig = process.env.ADMIN_ALLOWED_IPS) {
  const configuredTokens = tokenizeAllowedIps(allowedIpsConfig);

  if (configuredTokens.length === 0) {
    return true;
  }

  const clientIp = getClientIpFromHeaders(headers);

  if (!clientIp) {
    return false;
  }

  const rules = configuredTokens.map(parseAllowedIpRule).filter((rule): rule is AllowedIpRule => Boolean(rule));

  if (rules.length === 0) {
    return false;
  }

  return rules.some((rule) => doesIpMatchRule(clientIp, rule));
}

export function getClientIpFromHeaders(headers: HeaderReader) {
  return (
    normalizeIpToken(headers.get('x-daeho-client-ip')) ??
    normalizeIpToken(headers.get('cf-connecting-ip')) ??
    normalizeIpToken(headers.get('x-forwarded-for')) ??
    normalizeIpToken(headers.get('x-real-ip'))
  );
}

function tokenizeAllowedIps(allowedIpsConfig: string | undefined) {
  return (allowedIpsConfig ?? '')
    .split(/[,\s]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function parseAllowedIpRule(token: string): AllowedIpRule | null {
  const [rawIp, rawPrefixLength] = token.split('/');
  const ip = normalizeIpToken(rawIp);

  if (!ip) {
    return null;
  }

  if (rawPrefixLength !== undefined) {
    const address = parseIpv4Address(ip);
    const prefixLength = Number(rawPrefixLength);

    if (address === null || !Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) {
      return null;
    }

    const mask = createIpv4Mask(prefixLength);

    return {
      type: 'ipv4',
      address: (address & mask) >>> 0,
      mask
    };
  }

  const ipv4Address = parseIpv4Address(ip);

  if (ipv4Address !== null) {
    return {
      type: 'ipv4',
      address: ipv4Address,
      mask: createIpv4Mask(32)
    };
  }

  return {
    type: 'exact',
    ip
  };
}

function doesIpMatchRule(clientIp: string, rule: AllowedIpRule) {
  if (rule.type === 'exact') {
    return clientIp === rule.ip;
  }

  const clientAddress = parseIpv4Address(clientIp);

  if (clientAddress === null) {
    return false;
  }

  return ((clientAddress & rule.mask) >>> 0) === rule.address;
}

function normalizeIpToken(value: string | null | undefined) {
  const firstValue = value?.split(',')[0]?.trim();

  if (!firstValue) {
    return null;
  }

  let ip = firstValue;

  if (ip.startsWith('[')) {
    const bracketEnd = ip.indexOf(']');

    if (bracketEnd > 0) {
      ip = ip.slice(1, bracketEnd);
    }
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.slice(0, ip.lastIndexOf(':'));
  }

  const normalizedIp = ip.toLowerCase();

  if (normalizedIp.startsWith('::ffff:')) {
    return normalizedIp.slice('::ffff:'.length);
  }

  return normalizedIp;
}

function parseIpv4Address(ip: string) {
  const parts = ip.split('.');

  if (parts.length !== 4) {
    return null;
  }

  let address = 0;

  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      return null;
    }

    const octet = Number(part);

    if (octet < 0 || octet > 255) {
      return null;
    }

    address = (address << 8) + octet;
  }

  return address >>> 0;
}

function createIpv4Mask(prefixLength: number) {
  return prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
}
