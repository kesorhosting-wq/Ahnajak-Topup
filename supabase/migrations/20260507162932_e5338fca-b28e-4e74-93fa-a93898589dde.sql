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
      url := 'https://mejmrckrsvvjrpmftdjo.supabase.co/functions/v1/process-topup',
      body := jsonb_build_object(
        'action', 'fulfill',
        'orderId', NEW.id::text,
        'isPreorder', (TG_TABLE_NAME = 'preorder_orders')
      ),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
    RAISE LOG 'Triggered process-topup for order % (status: paid)', NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_preorder_status_paid ON public.preorder_orders;
CREATE TRIGGER on_preorder_status_paid
AFTER UPDATE OF status ON public.preorder_orders
FOR EACH ROW EXECUTE FUNCTION public.trigger_process_topup_on_paid();