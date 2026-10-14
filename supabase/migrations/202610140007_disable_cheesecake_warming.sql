-- Cheesecake has no warming slot. Existing installations must match fresh schema seeds.
-- Keep option records for historical order references; disallow new orders using them.
update public.menu_options
set active = false
where menu_item_id = 'cheesecake'
  and group_name = '데우기';
