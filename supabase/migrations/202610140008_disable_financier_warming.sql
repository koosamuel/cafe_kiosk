-- Only croissant offers heating among the current three food items.
-- Preserve historical option references while blocking new selections.
update public.menu_options
set active = false
where menu_item_id = 'financier'
  and group_name = '데우기';
