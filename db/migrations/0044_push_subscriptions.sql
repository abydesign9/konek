-- Web Push subscriptions. Each browser/device that opts in stores one row with
-- its push endpoint and keys. Sending a push looks up all of a user's rows and
-- delivers to each; dead endpoints (410/404) are pruned on send.
CREATE TABLE push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES users(id),
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX push_subscriptions_user ON push_subscriptions (user_id);
