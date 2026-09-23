import net from "node:net";
import http from "node:http";
import https from "node:https";
import { lookup } from "node:dns/promises";

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

export type DnsResolver = (hostname: string) => Promise<ResolvedAddress[]>;

export interface UrlInspection {
  ok: boolean;
  reason?: string;
  hostname?: string;
}

export interface UrlValidation extends UrlInspection {
  address?: string;
  family?: 4 | 6;
}

// Nombres reservados que nunca deben resolverse por el checker
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata",
  "metadata.google.internal",
]);

const BLOCKED_HOSTNAME_SUFFIXES = [".localhost", ".local", ".internal"];

// Rangos IPv4 no públicos (loopback, privados, link-local, metadata, reservados)
const BLOCKED_IPV4_CIDRS: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

export const defaultResolver: DnsResolver = async (hostname) => {
  const results = await lookup(hostname, { all: true });
  return results.map((entry) => ({
    address: entry.address,
    family: entry.family as 4 | 6,
  }));
};

const ipv4ToInt = (ip: string): number => {
  const parts = ip.split(".").map(Number);
  return (
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
  );
};

const inCidr4 = (ip: string, base: string, bits: number): boolean => {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
};

const isBlockedIpv4 = (ip: string): boolean =>
  BLOCKED_IPV4_CIDRS.some(([base, bits]) => inCidr4(ip, base, bits));

// Expande una IPv6 a 8 grupos de 16 bits, resolviendo "::" y IPv4 embebida
const expandIpv6 = (rawIp: string): number[] | null => {
  let ip = rawIp;
  const zone = ip.indexOf("%");
  if (zone !== -1) ip = ip.slice(0, zone);
  if (net.isIP(ip) !== 6) return null;

  let head = ip;
  let tail = "";
  const compressedAt = ip.indexOf("::");
  if (compressedAt !== -1) {
    head = ip.slice(0, compressedAt);
    tail = ip.slice(compressedAt + 2);
  }

  const parseGroups = (part: string): number[] | null => {
    if (part === "") return [];
    const groups = part.split(":");
    const out: number[] = [];
    for (const group of groups) {
      if (group.includes(".")) {
        if (net.isIP(group) !== 4) return null;
        const bytes = group.split(".").map(Number);
        out.push((bytes[0] << 8) | bytes[1], (bytes[2] << 8) | bytes[3]);
      } else {
        const value = parseInt(group, 16);
        if (Number.isNaN(value) || value < 0 || value > 0xffff) return null;
        out.push(value);
      }
    }
    return out;
  };

  const headGroups = parseGroups(head);
  const tailGroups = parseGroups(tail);
  if (!headGroups || !tailGroups) return null;

  let groups: number[];
  if (compressedAt !== -1) {
    const missing = 8 - headGroups.length - tailGroups.length;
    if (missing < 0) return null;
    groups = [
      ...headGroups,
      ...new Array(missing).fill(0),
      ...tailGroups,
    ];
  } else {
    groups = headGroups;
  }

  return groups.length === 8 ? groups : null;
};

const ipv4FromGroups = (groups: number[]): string =>
  [
    (groups[6] >> 8) & 0xff,
    groups[6] & 0xff,
    (groups[7] >> 8) & 0xff,
    groups[7] & 0xff,
  ].join(".");

const isBlockedIpv6 = (ip: string): boolean => {
  const groups = expandIpv6(ip);
  if (!groups) return true;

  const bytes: number[] = [];
  for (const group of groups) {
    bytes.push((group >> 8) & 0xff, group & 0xff);
  }

  const allZero = groups.every((group) => group === 0);
  if (allZero) return true;

  // ::1 loopback
  if (groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1) {
    return true;
  }

  // fe80::/10 link-local
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true;

  // fc00::/7 unique local
  if ((bytes[0] & 0xfe) === 0xfc) return true;

  // ff00::/8 multicast
  if (bytes[0] === 0xff) return true;

  // 2001:db8::/32 documentación
  if (groups[0] === 0x2001 && groups[1] === 0x0db8) return true;

  // IPv4-mapped ::ffff:0:0/96 e IPv4-compatibles ::/96
  const isMapped =
    groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff;
  const isCompatible = groups.slice(0, 6).every((group) => group === 0);
  if (isMapped || isCompatible) {
    return isBlockedIpv4(ipv4FromGroups(groups));
  }

  // NAT64 64:ff9b::/96
  if (
    groups[0] === 0x0064 &&
    groups[1] === 0xff9b &&
    groups.slice(2, 6).every((group) => group === 0)
  ) {
    return isBlockedIpv4(ipv4FromGroups(groups));
  }

  return false;
};

export const isBlockedIp = (ip: string, family: number): boolean => {
  if (family === 4 || net.isIP(ip) === 4) return isBlockedIpv4(ip);
  return isBlockedIpv6(ip);
};

const normalizeHostname = (hostname: string): string => {
  const lower = hostname.toLowerCase();
  if (lower.startsWith("[") && lower.endsWith("]")) {
    return lower.slice(1, -1);
  }
  return lower;
};

// Validación síncrona: protocolo, hostnames reservados y literales IP no públicos
export const inspectUrl = (rawUrl: string): UrlInspection => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "Only http and https URLs are allowed" };
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname) {
    return { ok: false, reason: "URL host is missing" };
  }

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    return { ok: false, reason: "URL host is not allowed" };
  }

  const literalFamily = net.isIP(hostname);
  if (literalFamily && isBlockedIp(hostname, literalFamily)) {
    return {
      ok: false,
      reason: "URL resolves to a non-public address",
      hostname,
    };
  }

  return { ok: true, hostname };
};

// Validación asíncrona: además resuelve DNS y rechaza IPs internas resultantes
export const validatePublicHttpUrl = async (
  rawUrl: string,
  resolver: DnsResolver = defaultResolver,
): Promise<UrlValidation> => {
  const inspection = inspectUrl(rawUrl);
  if (!inspection.ok) return inspection;

  const hostname = inspection.hostname!;
  const literalFamily = net.isIP(hostname);
  if (literalFamily) {
    return { ok: true, hostname, address: hostname, family: literalFamily as 4 | 6 };
  }

  let addresses: ResolvedAddress[];
  try {
    addresses = await resolver(hostname);
  } catch {
    return { ok: false, reason: "Could not resolve URL host", hostname };
  }

  if (addresses.length === 0) {
    return { ok: false, reason: "Could not resolve URL host", hostname };
  }

  for (const entry of addresses) {
    if (isBlockedIp(entry.address, entry.family)) {
      return {
        ok: false,
        reason: "URL host resolves to a non-public address",
        hostname,
      };
    }
  }

  const chosen = addresses[0];
  return {
    ok: true,
    hostname,
    address: chosen.address,
    family: chosen.family,
  };
};

// Fija la IP ya validada en el agente para evitar DNS rebinding entre la
// validación y la petición real.
export const createPinnedAgentOptions = (address: string, family: number) => {
  const pinnedLookup = (
    _hostname: string,
    options: unknown,
    callback: (
      err: NodeJS.ErrnoException | null,
      result: string | Array<{ address: string; family: number }>,
      resolvedFamily?: number,
    ) => void,
  ) => {
    // Node llama al lookup con { all: true } (autoSelectFamily activo por
    // defecto) y espera la forma array [{ address, family }]. Con all: false
    // espera la forma simple (address, family). Responder a ambas evita
    // ERR_INVALID_IP_ADDRESS: Invalid IP address: undefined.
    const multi = (options as { all?: boolean })?.all;
    if (multi) {
      callback(null, [{ address, family }]);
    } else {
      callback(null, address, family);
    }
  };

  return {
    httpAgent: new http.Agent({ lookup: pinnedLookup as any }),
    httpsAgent: new https.Agent({ lookup: pinnedLookup as any }),
  };
};
