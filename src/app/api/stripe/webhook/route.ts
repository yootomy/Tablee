import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureOperationalSchema } from "@/lib/app-schema";
import {
  applyStripeSubscriptionSnapshot,
  getStripe,
  resolveFamilyIdFromStripeContext,
  syncStripeSubscriptionById,
} from "@/lib/stripe";

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET n'est pas configurée.");
  }

  return secret;
}

async function persistWebhookEvent(input: {
  familyId?: string | null;
  eventId: string;
  eventType: string;
  payload: unknown;
}) {
  try {
    await prisma.billing_webhook_events.create({
      data: {
        family_id: input.familyId ?? undefined,
        provider: "stripe",
        event_id: input.eventId,
        event_type: input.eventType,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });

    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return false;
    }

    throw error;
  }
}

async function markWebhookProcessed(eventId: string) {
  await prisma.billing_webhook_events.updateMany({
    where: {
      provider: "stripe",
      event_id: eventId,
    },
    data: {
      processed_at: new Date(),
    },
  });
}

async function handleCheckoutCompleted(event: Awaited<ReturnType<typeof buildStripeEvent>>) {
  const session = event.data.object;

  if (session.object !== "checkout.session") {
    return;
  }

  const familyId =
    typeof session.metadata?.familyId === "string" ? session.metadata.familyId : null;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  if (!familyId || !customerId) {
    return;
  }

  await prisma.family_billing_accounts.upsert({
    where: { family_id: familyId },
    create: {
      family_id: familyId,
      stripe_customer_id: customerId,
      billing_email: session.customer_details?.email ?? undefined,
    },
    update: {
      stripe_customer_id: customerId,
      billing_email: session.customer_details?.email ?? undefined,
    },
  });

  if (typeof session.subscription === "string") {
    await syncStripeSubscriptionById({
      stripeSubscriptionId: session.subscription,
      familyIdHint: familyId,
      stripeCustomerIdHint: customerId,
    });
  }
}

async function handleSubscriptionEvent(event: Awaited<ReturnType<typeof buildStripeEvent>>) {
  const subscription = event.data.object;

  if (subscription.object !== "subscription") {
    return;
  }

  const familyId = await resolveFamilyIdFromStripeContext({
    familyIdHint:
      typeof subscription.metadata?.familyId === "string"
        ? subscription.metadata.familyId
        : null,
    stripeCustomerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id ?? null,
    stripeSubscriptionId: subscription.id,
  });

  if (!familyId) {
    return;
  }

  await applyStripeSubscriptionSnapshot({
    familyId,
    stripeCustomerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id ?? null,
    stripeSubscriptionId: subscription.id,
    stripePriceIdCurrent: subscription.items.data[0]?.price.id ?? null,
    status: subscription.status,
    trialEndAt: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null,
    currentPeriodEndAt:
      "current_period_end" in subscription && typeof subscription.current_period_end === "number"
        ? new Date(subscription.current_period_end * 1000)
        : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

async function handleInvoiceEvent(event: Awaited<ReturnType<typeof buildStripeEvent>>) {
  const invoice = event.data.object;

  if (invoice.object !== "invoice") {
    return;
  }

  const invoiceLike = invoice as {
    subscription?: string | { id: string } | null;
    customer?: string | { id: string } | null;
  };
  const subscriptionId =
    typeof invoiceLike.subscription === "string"
      ? invoiceLike.subscription
      : invoiceLike.subscription?.id ?? null;
  const customerId =
    typeof invoiceLike.customer === "string"
      ? invoiceLike.customer
      : invoiceLike.customer?.id ?? null;

  if (!subscriptionId) {
    return;
  }

  await syncStripeSubscriptionById({
    stripeSubscriptionId: subscriptionId,
    stripeCustomerIdHint: customerId,
  });
}

async function buildStripeEvent(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    throw new Error("Signature Stripe manquante.");
  }

  return getStripe().webhooks.constructEvent(payload, signature, getWebhookSecret());
}

export async function POST(request: Request) {
  try {
    await ensureOperationalSchema();

    const event = await buildStripeEvent(request);
    const objectWithMetadata = event.data.object as {
      metadata?: Record<string, unknown>;
      customer?: string | { id: string } | null;
      id?: string;
      object?: string;
    };
    const familyId = await resolveFamilyIdFromStripeContext({
      familyIdHint:
        typeof objectWithMetadata.metadata?.familyId === "string"
          ? objectWithMetadata.metadata.familyId
          : null,
      stripeCustomerId:
        typeof objectWithMetadata.customer === "string"
          ? objectWithMetadata.customer
          : null,
      stripeSubscriptionId:
        objectWithMetadata.object === "subscription"
          ? objectWithMetadata.id ?? null
          : null,
    });

    const created = await persistWebhookEvent({
      familyId,
      eventId: event.id,
      eventType: event.type,
      payload: event,
    });

    if (!created) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(event);
        break;
      case "invoice.paid":
      case "invoice.payment_failed":
        await handleInvoiceEvent(event);
        break;
      default:
        break;
    }

    await markWebhookProcessed(event.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Webhook Stripe invalide ou non traité.",
      },
      { status: 400 },
    );
  }
}
