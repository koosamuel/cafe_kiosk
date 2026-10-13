-- 발표 데모: 아이디 없이 공용 운영 번호로 최근 실제 주문을 검수합니다.
-- orders/order_items 테이블의 익명 RLS는 개방하지 않습니다.

-- 초기 배포본에 total_amount 기본값이 없던 경우에도 주문 생성이 가능하도록 보정합니다.
alter table public.orders alter column total_amount set default 0;

revoke all on function public.create_kiosk_order(text, text, jsonb, uuid) from public;
grant execute on function public.create_kiosk_order(text, text, jsonb, uuid) to anon, authenticated;

create or replace function public.list_demo_kiosk_orders(p_operator_pin text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if encode(extensions.digest(coalesce(p_operator_pin, ''), 'sha256'), 'hex') <>
    'bcb15f821479b4d5772bd0ca866c00ad5f926e3580720659cc80d39c9d09802a' then
    raise exception 'invalid operator pin';
  end if;

  return (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'order_number', o.order_number,
          'order_type', o.order_type,
          'payment_method', o.payment_method,
          'status', o.status,
          'total_amount', o.total_amount,
          'created_at', o.created_at,
          'order_items', (
            select coalesce(
              jsonb_agg(
                jsonb_build_object(
                  'id', oi.id,
                  'item_name', oi.item_name,
                  'quantity', oi.quantity,
                  'option_summary', oi.option_summary
                ) order by oi.id
              ),
              '[]'::jsonb
            )
            from public.order_items oi
            where oi.order_id = o.id
          )
        ) order by o.created_at
      ),
      '[]'::jsonb
    )
    from public.orders o
    where o.status in ('received', 'preparing', 'ready')
      and o.created_at >= now() - interval '24 hours'
  );
end;
$$;

revoke all on function public.list_demo_kiosk_orders(text) from public;
grant execute on function public.list_demo_kiosk_orders(text) to anon, authenticated;

create or replace function public.advance_demo_kiosk_order(
  p_operator_pin text,
  p_order_id uuid,
  p_next_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if encode(extensions.digest(coalesce(p_operator_pin, ''), 'sha256'), 'hex') <>
    'bcb15f821479b4d5772bd0ca866c00ad5f926e3580720659cc80d39c9d09802a' then
    raise exception 'invalid operator pin';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
    and created_at >= now() - interval '24 hours'
  for update;

  if not found then
    raise exception 'active demo order not found';
  end if;

  if not (
    (v_order.status = 'received' and p_next_status = 'preparing') or
    (v_order.status = 'preparing' and p_next_status = 'ready') or
    (v_order.status = 'ready' and p_next_status = 'completed')
  ) then
    raise exception 'invalid order status transition';
  end if;

  update public.orders
  set status = p_next_status, updated_at = now()
  where id = p_order_id
  returning * into v_order;

  return jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'updated_at', v_order.updated_at
  );
end;
$$;

revoke all on function public.advance_demo_kiosk_order(text, uuid, text) from public;
grant execute on function public.advance_demo_kiosk_order(text, uuid, text) to anon, authenticated;
