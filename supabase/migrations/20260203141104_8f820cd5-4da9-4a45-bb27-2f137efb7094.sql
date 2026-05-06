-- Fix: trigger_process_topup_on_paid was calling fulfillment in the wrong backend project.
-- Update it to call the current project's process-topup function, and remove the hard-coded Authorization header.

CREATE OR REPLACE FUNCTION public.trigger_process_topup_on_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger when status changes TO 'paid'
  IF (
    NEW.status = 'paid'
    AND (OLD.status IS NULL OR OLD.status NOT IN ('paid', 'processing', 'completed', 'failed'))
  ) THEN
    -- Async HTTP request to backend function (no auth required by process-topup)
    PERFORM net.http_post(
      url := 'https://aypndupnzyuhuuoanigc.supabase.co/functions/v1/process-topup',
      body := jsonb_build_object(
        'action', 'fulfill',
        'orderId', NEW.id::text
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      )
    );

    RAISE LOG 'Triggered process-topup for order % (status: paid)', NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;