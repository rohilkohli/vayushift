import { isIP } from "node:net";

/** Groups an IPv6 address by its /64, so a client cannot dodge a limit by rotating addresses within its prefix. */
function ipv6Prefix(ip: string): string {
  const [head, tail = ""] = ip.split("::");
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const groups = ip.includes("::") ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t] : h;
  return `${groups
    .slice(0, 4)
    .map((g) => g.padStart(4, "0"))
    .join(":")}::/64`;
}

/**
 * The address of the real client, for rate limiting.
 *
 * X-Forwarded-For is a list that each proxy appends to, so the LEFT side is whatever the client chose to
 * send and cannot be trusted: reading it would let anyone bypass a rate limit by inventing a header. We
 * read from the RIGHT instead, skipping the `trustedHops` proxies we run or rely on (Cloud Run alone: 1;
 * behind an external HTTPS load balancer: 2). Anything that is not a valid IP yields "unknown".
 */
export function clientIp(headers: Headers, trustedHops: number): string {
  if (trustedHops <= 0) return "unknown";
  const parts = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return "unknown";
  let candidate = parts[Math.max(0, parts.length - trustedHops)];
  candidate = candidate.replace(/^\[(.*)\]$/, "$1").replace(/^(\d+\.\d+\.\d+\.\d+):\d+$/, "$1");
  if (candidate.includes(":") && candidate.includes(".")) candidate = candidate.slice(candidate.lastIndexOf(":") + 1); // ::ffff:1.2.3.4
  const kind = isIP(candidate);
  if (kind === 4) return candidate;
  if (kind === 6) return ipv6Prefix(candidate);
  return "unknown";
}
