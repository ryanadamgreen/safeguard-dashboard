import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);

// £150 ex-VAT per home per month
const UNIT_AMOUNT_PENCE = 15000;

// Lazily created 20% UK VAT tax rate — cached for the process lifetime.
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
    inclusive: false,
    active: true,
  });

  _vatRateId = rate.id;
  console.log("[send-payment-link] Created VAT tax rate:", _vatRateId);
  return _vatRateId;
}

function buildEmailHtml({
  orgName,
  homeCount,
  checkoutUrl,
}: {
  orgName: string;
  homeCount: number;
  checkoutUrl: string;
}): string {
  const homeLabel = homeCount === 1 ? "1 home" : `${homeCount} homes`;
  const netMonthly = homeCount * 150;
  const vatAmount = (netMonthly * 0.2).toFixed(2);
  const grossMonthly = (netMonthly * 1.2).toFixed(2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Set up your SafeGuard subscription</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#1e3a8a;padding:28px 40px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">SafeGuard</p>
              <p style="margin:4px 0 0;font-size:13px;color:#93c5fd;">Device Monitoring Platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 0;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#0f172a;line-height:1.3;">Set up your SafeGuard subscription</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.65;">
                Your organisation <strong style="color:#1e293b;">${orgName}</strong> is ready to move to a paid SafeGuard subscription. Please click the button below to securely set up your payment method.
              </p>

              <!-- Price summary -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:0 0 28px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 14px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.07em;">Monthly subscription</p>
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="font-size:14px;color:#475569;padding:4px 0;">${homeLabel} &times; &pound;150/month</td>
                        <td align="right" style="font-size:14px;font-weight:500;color:#334155;padding:4px 0;">&pound;${netMonthly}.00</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#94a3b8;padding:4px 0;">VAT (20%)</td>
                        <td align="right" style="font-size:14px;color:#94a3b8;padding:4px 0;">&pound;${vatAmount}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding:8px 0 0;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></td>
                      </tr>
                      <tr>
                        <td style="font-size:15px;font-weight:600;color:#0f172a;padding:8px 0 4px;">Total per month</td>
                        <td align="right" style="font-size:15px;font-weight:700;color:#0f172a;padding:8px 0 4px;">&pound;${grossMonthly}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px;">
                <tr>
                  <td style="background:#1d4ed8;border-radius:8px;">
                    <a href="${checkoutUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.1px;">Set Up Payment &rarr;</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:13px;color:#94a3b8;">
                This link expires in <strong>24 hours</strong>. You can accept card or BACS Direct Debit.
              </p>
              <p style="margin:0 0 28px;font-size:13px;color:#94a3b8;">
                If you did not expect this email, please ignore it or contact us at <a href="mailto:support@safeguard.care" style="color:#3b82f6;text-decoration:none;">support@safeguard.care</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                SafeGuard &mdash; Device Monitoring for Care Homes<br>
                Need help? Email <a href="mailto:support@safeguard.care" style="color:#3b82f6;text-decoration:none;">support@safeguard.care</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { orgId, orgName, orgEmail, toEmail, cc, orgAddress, homeCount, existingCustomerId } =
      (await req.json()) as {
        orgId: number;
        orgName: string;
        orgEmail: string;   // used for Stripe customer record
        toEmail: string;    // actual To address (may differ from orgEmail)
        cc?: string[];      // optional CC addresses
        orgAddress?: string;
        homeCount: number;
        existingCustomerId?: string;
      };

    if (!orgName || !orgEmail || !toEmail || !homeCount) {
      return NextResponse.json(
        { error: "orgName, orgEmail, toEmail, and homeCount are required" },
        { status: 400 }
      );
    }

    // ── 1. Get or create Stripe customer ──────────────────────────────────────
    let customerId = existingCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: orgName,
        email: orgEmail,
        ...(orgAddress ? { address: { line1: orgAddress, country: "GB" } } : {}),
        metadata: { orgId: String(orgId), source: "safeguard-dashboard" },
      });
      customerId = customer.id;
      console.log("[send-payment-link] Created Stripe customer:", customerId);
    }

    // ── 2. Create Stripe checkout session ──────────────────────────────────────
    const origin =
      req.headers.get("origin") ??
      req.headers.get("referer")?.replace(/\/$/, "") ??
      "http://localhost:3000";

    const totalExVat = homeCount * 150;
    const homeLabel = homeCount === 1 ? "1 home" : `${homeCount} homes`;
    const lineDescription = `${homeLabel} × £150/month = £${totalExVat}/month ex-VAT`;

    const vatRateId = await getVatTaxRateId();

    // Stripe checkout sessions have a 24-hour maximum expiry; use 23 hours to stay safely within that.
    const expiresAt = Math.floor(Date.now() / 1000) + 23 * 60 * 60;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card", "bacs_debit"],
      customer_update: { address: "auto" },
      expires_at: expiresAt,

      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: UNIT_AMOUNT_PENCE,
            recurring: { interval: "month" },
            tax_behavior: "exclusive",
            product_data: {
              name: "SafeGuard — Monthly Device Monitoring",
              description: lineDescription,
            },
          },
          quantity: homeCount,
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

    // ── 3. Send email via Resend ───────────────────────────────────────────────
    const fromAddress =
      process.env.RESEND_FROM_EMAIL ?? "SafeGuard <onboarding@resend.dev>";

    const { error: emailError } = await resend.emails.send({
      from: fromAddress,
      to: toEmail,
      ...(cc && cc.length > 0 ? { cc } : {}),
      subject: "Set up your SafeGuard subscription — action required",
      html: buildEmailHtml({ orgName, homeCount, checkoutUrl: session.url }),
    });

    if (emailError) {
      console.error("[send-payment-link] Resend error:", emailError);
      return NextResponse.json(
        { error: `Email failed to send: ${emailError.message}` },
        { status: 500 }
      );
    }

    console.log(`[send-payment-link] Payment link emailed to ${toEmail} for org ${orgId}`);

    return NextResponse.json({ customerId, sentTo: toEmail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[send-payment-link]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
