import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// In a production app these handlers would write to a database.
// Here we log events — the client-side billingStore (localStorage) is updated
// by the /billing/success redirect for the common case. The webhook handles
// async events like payment failures and subscription cancellations.
function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(
        `[webhook] checkout.session.completed — org ${session.metadata?.orgId}, customer ${session.customer}`
      );
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
      console.log(
        `[webhook] invoice.payment_succeeded — subscription ${invoice.subscription}, customer ${invoice.customer}`
      );
      // In production: mark subscription active, store period_end
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
      console.warn(
        `[webhook] invoice.payment_failed — subscription ${invoice.subscription}, customer ${invoice.customer}`
      );
      // In production: mark subscription past_due, notify admin
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      console.log(
        `[webhook] customer.subscription.updated — status: ${sub.status}, org: ${sub.metadata?.orgId}`
      );
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      console.warn(
        `[webhook] customer.subscription.deleted — org: ${sub.metadata?.orgId}`
      );
      // In production: mark subscription canceled, show banner to all staff in org
      break;
    }

    default:
      // Silently ignore unhandled event types
      break;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  // If the webhook secret is still the placeholder, skip signature verification
  // so local development works without a Stripe CLI session.
  const isPlaceholder =
    !webhookSecret || webhookSecret === "whsec_add_later";

  let event: Stripe.Event;

  if (isPlaceholder) {
    console.warn(
      "[webhook] STRIPE_WEBHOOK_SECRET is not configured — skipping signature verification. Set it to your Stripe CLI secret for local testing."
    );
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  } else {
    if (!sig) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      console.error("[webhook] Signature verification failed:", message);
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  handleEvent(event);

  return NextResponse.json({ received: true });
}
