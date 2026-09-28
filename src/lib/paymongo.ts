import crypto from "crypto";

// PayMongo REST helper (server-only). Test vs live is decided purely by which
// secret key is configured.
const API = "https://api.paymongo.com/v1";

export function paymongoMode(): "test" | "live" {
  return (process.env.PAYMONGO_SECRET_KEY ?? "").startsWith("sk_live") ? "live" : "test";
}

function authHeader(): string {
  const key = process.env.PAYMONGO_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

export type LineItem = {
  currency: string;
  amount: number; // centavos, per unit
  name: string;
  quantity: number;
};

export async function createCheckoutSession(opts: {
  lineItems: LineItem[];
  description?: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  paymentMethodTypes?: string[];
}): Promise<{ id: string; checkoutUrl: string }> {
  const body = {
    data: {
      attributes: {
        line_items: opts.lineItems,
        payment_method_types:
          opts.paymentMethodTypes ?? ["card", "gcash", "paymaya", "grab_pay"],
        success_url: opts.successUrl,
        cancel_url: opts.cancelUrl,
        description: opts.description,
        send_email_receipt: false,
        metadata: opts.metadata ?? {},
      },
    },
  };

  const res = await fetch(`${API}/checkout_sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    const detail = json?.errors?.[0]?.detail ?? `PayMongo error ${res.status}`;
    throw new Error(detail);
  }
  return {
    id: json.data.id as string,
    checkoutUrl: json.data.attributes.checkout_url as string,
  };
}

// Verify the Paymongo-Signature header.
// Header format: "t=<unix>,te=<testSig>,li=<liveSig>".
// Signed message = `${t}.${rawBody}`, HMAC-SHA256 with the webhook signing secret
// (hex). Compare `te` in test mode, `li` in live mode, timing-safe.
export function verifyWebhookSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  mode: "test" | "live" = "test"
): boolean {
  if (!header || !secret) return false;
  const parts: Record<string, string> = {};
  for (const kv of header.split(",")) {
    const idx = kv.indexOf("=");
    if (idx === -1) continue;
    parts[kv.slice(0, idx).trim()] = kv.slice(idx + 1).trim();
  }
  const t = parts["t"];
  const provided = mode === "live" ? parts["li"] : parts["te"];
  if (!t || !provided) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${rawBody}`)
    .digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
