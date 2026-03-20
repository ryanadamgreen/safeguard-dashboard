import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// £150 ex-VAT per home per month — expressed in pence for Stripe
const UNIT_AMOUNT_PENCE = 15000;

// Lazily created 20% UK VAT tax rate — cached for the process lifetime.
// On first checkout call we either read STRIPE_VAT_RATE_ID from env or create
// a new tax rate object in Stripe and reuse it for all subsequent calls.
let _vatRateId: string | null = null;

async function getVatTaxRateId(): Promise<string> {
  if (_vatRateId) return _vatRateId;

  if (process.env.STRIPE_VAT_RATE_ID) {
    _vatRateId = process.env.STRIPE_VAT_RATE_ID;
    return _vatRateId;
  }

  const rate = await stripe.taxRates.create({
    display_name: "VAT",
    description: "UK Value Added Tax (20%)",
    jurisdiction: "GB",
    percentage: 20,
    inclusive: false, // exclusive — added on top of the ex-VAT price
    active: true,
  });

  _vatRateId = rate.id;
  console.log("[create-checkout-session] Created VAT tax rate:", _vatRateId);
  return _vatRateId;
}

export async function POST(req: NextRequest) {
  try {
    const { customerId, orgId, orgName, homeCount } = (await req.json()) as {
      customerId: string;
      orgId: number;
      orgName: string;
      homeCount: number;
    };

    if (!customerId || !orgId || !homeCount) {
      return NextResponse.json(
        { error: "customerId, orgId, and homeCount are required" },
        { status: 400 }
      );
    }

    const origin =
      req.headers.get("origin") ??
      req.headers.get("referer")?.replace(/\/$/, "") ??
      "http://localhost:3000";

    const totalExVat = homeCount * 150;
    const homeLabel = homeCount === 1 ? "1 home" : `${homeCount} homes`;
    const lineDescription = `${homeLabel} × £150/month = £${totalExVat}/month ex-VAT`;

    // Ensure the VAT tax rate exists in Stripe
    const vatRateId = await getVatTaxRateId();

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",

      // BACS Direct Debit + Card — both available at checkout
      payment_method_types: ["card", "bacs_debit"],

      // Save the billing address the customer enters during checkout
      customer_update: { address: "auto" },

      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: UNIT_AMOUNT_PENCE, // £150 per home (ex-VAT)
            recurring: { interval: "month" },
            // exclusive: price shown is before tax; 20% VAT added via tax_rates below
            tax_behavior: "exclusive",
            product_data: {
              name: "SafeGuard — Monthly Device Monitoring",
              description: lineDescription,
            },
          },
          quantity: homeCount,
          // Manual 20% UK VAT — no customer address required
          tax_rates: [vatRateId],
        },
      ],

      success_url: `${origin}/billing/success?org=${orgId}&homes=${homeCount}&name=${encodeURIComponent(orgName)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/admin/organisations`,

      metadata: { orgId: String(orgId), orgName },
      subscription_data: {
        metadata: { orgId: String(orgId), orgName },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[create-checkout-session]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
