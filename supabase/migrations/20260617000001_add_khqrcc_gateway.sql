-- 1. Insert KHQRcc (ABA Pay) gateway config
INSERT INTO public.payment_gateways (slug, name, enabled, config)
VALUES (
  'khqrcc',
  'KHQRcc (ABA Pay)',
  false,
  '{
    "profile_id": "",
    "secret_key": "",
    "checkout_url": "https://khqr.cc/api/payment/requestv2"
  }'::jsonb
) ON CONFLICT (slug) DO NOTHING;
