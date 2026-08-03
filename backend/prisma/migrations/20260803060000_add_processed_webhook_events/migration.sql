-- Stripe delivers events at least once, so a redelivery must not grant
-- credits twice. The unique constraint on stripe_event_id is what makes the
-- "insert inside the credit transaction" pattern actually safe under
-- concurrent redeliveries.
CREATE TABLE "processed_webhook_events" (
    "id" TEXT NOT NULL,
    "stripe_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "processed_webhook_events_stripe_event_id_key" ON "processed_webhook_events"("stripe_event_id");
