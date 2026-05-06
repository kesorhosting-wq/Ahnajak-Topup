CREATE TRIGGER on_topup_order_paid
  AFTER INSERT OR UPDATE ON public.topup_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_process_topup_on_paid();