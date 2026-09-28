import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature, paymongoMode } from "@/lib/paymongo";
import { fulfillOrder } from "@/lib/fulfillment";
import { createAdminClient } from "@/lib/supabase-admin";

// PayMongo posts here. We verify the signature over the RAW body, then grant
// access from the verified event only. Always 2xx after a valid signature so
// PayMongo stops retrying (fulfilment is idempotent).
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get("paymongo-signature");
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET ?? "";

  if (!verifyWebhookSignature(raw, signature, secret, paymongoMode())) {
    return new NextResponse("invalid signature", { status: 400 });
  }

  let evt: {
    data?: { attributes?: { type?: string; data?: { id?: string; attributes?: Record<string, unknown> } } };
  };
  try {
    evt = JSON.parse(raw);
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  const type = evt.data?.attributes?.type;
  const resource = evt.data?.attributes?.data;
  const resourceAttrs = (resource?.attributes ?? {}) as Record<string, unknown>;

  // Current PayMongo emits `payment.paid`; older checkout integrations use
  // `checkout_session.payment.paid`. Handle both.
  if (type === "checkout_session.payment.paid" || type === "payment.paid") {
    const metadata = (resourceAttrs.metadata ?? {}) as Record<string, string>;
    let orderId: string | undefined = metadata.order_id;

    // Fallback: correlate by the checkout session id we stored on the order.
    if (!orderId && resource?.id) {
      const admin = createAdminClient();
      const { data } = await admin
        .from("orders")
        .select("id")
        .eq("paymongo_checkout_id", resource.id)
        .maybeSingle();
      orderId = data?.id as string | undefined;
    }

    if (orderId) {
      // Try to capture a payment id from either shape.
      const payments = resourceAttrs.payments as
        | { id?: string; data?: { id?: string } }[]
        | undefined;
      const paymentId =
        (type === "payment.paid" ? resource?.id : payments?.[0]?.id ?? payments?.[0]?.data?.id) ??
        null;
      await fulfillOrder(orderId, { paymentId, raw: evt });
    }
  }

  return NextResponse.json({ received: true });
}
