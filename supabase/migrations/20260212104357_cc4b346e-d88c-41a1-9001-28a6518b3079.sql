-- Add zone_options column to store dropdown options for server ID
ALTER TABLE public.game_verification_configs 
ADD COLUMN zone_options jsonb DEFAULT NULL;

-- zone_options format: [{"value": "server_code", "label": "Server Name"}, ...]
-- When set, the Server ID field will render as a dropdown instead of free text input
COMMENT ON COLUMN public.game_verification_configs.zone_options IS 'JSON array of server options [{value, label}] for dropdown selection. NULL = free text input.';