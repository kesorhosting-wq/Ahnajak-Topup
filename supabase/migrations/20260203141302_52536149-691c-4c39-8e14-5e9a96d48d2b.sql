-- Security linter fix attempt: pg_net is installed in the public schema and is not relocatable.
-- The supported fix is to drop & reinstall it into the extensions schema, then recreate dependent trigger/function.

CREATE SCHEMA IF NOT EXISTS extensions;

-- Reinstall pg_net
DROP EXTENSION IF EXISTS pg_net CASCADE;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

-- Recreate the trigger function that calls fulfillment when an order becomes paid
CREATE OR REPLACE FUNCTION public.trigger_process_topup_on_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (
    NEW.status = 'paid'
    AND (OLD.status IS NULL OR OLD.status NOT IN ('paid', 'processing', 'completed', 'failed'))
  ) THEN
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

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS on_order_status_paid ON public.topup_orders;
CREATE TRIGGER on_order_status_paid
AFTER UPDATE OF status ON public.topup_orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_process_topup_on_paid();