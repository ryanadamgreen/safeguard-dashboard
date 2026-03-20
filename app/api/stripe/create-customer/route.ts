import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { orgId, orgName, email, address } = (await req.json()) as {
      orgId: number;
      orgName: string;
      email: string;
      address?: string;
    };

    if (!orgName || !email) {
      return NextResponse.json(
        { error: "orgName and email are required" },
        { status: 400 }
      );
    }

    const customer = await stripe.customers.create({
      name: orgName,
      email,
      // Pre-populate the billing address with the organisation's registered address.
      // The checkout session's customer_update: { address: 'auto' } will overwrite
      // this with the verified billing address they enter during payment.
      ...(address
        ? { address: { line1: address, country: "GB" } }
        : {}),
      metadata: { orgId: String(orgId), source: "safeguard-dashboard" },
    });

    return NextResponse.json({ customerId: customer.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[create-customer]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
