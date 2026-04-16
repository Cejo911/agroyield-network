-- ══════════════════════════════════════════════════════════════════════
-- Support Ticket System — Phase 4.7
-- Tables: support_tickets, support_ticket_messages,
--         support_ticket_events (audit trail), support_tokens (OTP)
-- ══════════════════════════════════════════════════════════════════════

-- ── Tickets ─────────────────────────────────────────────────────────
CREATE TABLE support_tickets (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject         text        NOT NULL,
  description     text        NOT NULL,
  category        text        NOT NULL DEFAULT 'general',
  priority        text        NOT NULL DEFAULT 'medium',
  status          text        NOT NULL DEFAULT 'open',
  assigned_to     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  sla_deadline    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  resolved_at     timestamptz,

  CONSTRAINT valid_category CHECK (category IN ('general','account','billing','technical','content','other')),
  CONSTRAINT valid_priority CHECK (priority IN ('low','medium','high','urgent')),
  CONSTRAINT valid_status   CHECK (status   IN ('open','in_progress','resolved','closed'))
);

CREATE INDEX idx_support_tickets_user     ON support_tickets(user_id, created_at DESC);
CREATE INDEX idx_support_tickets_status   ON support_tickets(status, created_at DESC);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to, status);
CREATE INDEX idx_support_tickets_sla      ON support_tickets(sla_deadline)
  WHERE status IN ('open', 'in_progress');

-- ── Ticket Messages (conversation thread) ───────────────────────────
CREATE TABLE support_ticket_messages (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id  uuid        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  message    text        NOT NULL,
  is_admin   boolean     DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_support_messages_ticket ON support_ticket_messages(ticket_id, created_at);

-- ── Ticket Events (audit trail) ─────────────────────────────────────
CREATE TABLE support_ticket_events (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id  uuid        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  actor_id   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text        NOT NULL,
  details    jsonb       DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_support_events_ticket ON support_ticket_events(ticket_id, created_at);

-- ── Verification Tokens (OTP for support access) ────────────────────
CREATE TABLE support_tokens (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  verified_at timestamptz,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_support_tokens_user ON support_tokens(user_id, expires_at DESC);

-- ══════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE support_tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tokens          ENABLE ROW LEVEL SECURITY;

-- Users can view + create their own tickets
CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view + add messages on their own tickets
CREATE POLICY "Users can view own ticket messages"
  ON support_ticket_messages FOR SELECT
  USING (ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert messages on own tickets"
  ON support_ticket_messages FOR INSERT
  WITH CHECK (
    ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid())
    AND auth.uid() = user_id
  );

-- Users can view events on their own tickets (read-only audit trail)
CREATE POLICY "Users can view own ticket events"
  ON support_ticket_events FOR SELECT
  USING (ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid()));

-- Users can view their own tokens
CREATE POLICY "Users can view own tokens"
  ON support_tokens FOR SELECT
  USING (auth.uid() = user_id);
