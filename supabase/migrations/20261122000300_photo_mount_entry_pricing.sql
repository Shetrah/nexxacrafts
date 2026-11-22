-- Each photo mount is submitted as its own order_items row, so its uploaded
-- photo, selected size, finish, quantity and price stay together. Require a
-- real per-size price or an active base rate before allowing a priced order.
create or replace function public.service_option_price(p_slug text, p_config jsonb)
returns numeric
language plpgsql stable security definer set search_path = public
as $$
declare
  service_fields jsonb;
  v_field jsonb;
  selected text;
  size_selected text;
  size_price numeric := 0;
  amount numeric := 0;
begin
  select s.fields into service_fields
  from public.services s
  where s.slug = p_slug and s.is_active = true;

  for v_field in select value from jsonb_array_elements(coalesce(service_fields, '[]'::jsonb)) loop
    if v_field->>'type' <> 'select' then continue; end if;
    selected := nullif(p_config->>(v_field->>'name'), '');
    if selected is null then continue; end if;
    if not (coalesce(v_field->'options', '[]'::jsonb) @> jsonb_build_array(selected)) then
      raise exception 'Invalid selection for %', v_field->>'label';
    end if;
    amount := amount + greatest(0, coalesce(nullif(v_field->'optionPrices'->>selected, '')::numeric, 0));
  end loop;

  if p_slug = 'photo-mounting' then
    size_selected := nullif(p_config->>'mounting_size', '');
    if size_selected is null then
      raise exception 'Select a size for every photo mount.';
    end if;
    select greatest(0, coalesce(nullif(field.value->'optionPrices'->>size_selected, '')::numeric, 0))
      into size_price
    from jsonb_array_elements(coalesce(service_fields, '[]'::jsonb)) as field(value)
    where field.value->>'name' = 'mounting_size';

    if coalesce(size_price, 0) <= 0 and not exists (
      select 1 from public.pricing_rates pr
      where pr.service_slug = p_slug and pr.active = true and pr.unit_rate > 0
    ) then
      raise exception 'No active price is configured for size %. Ask the team to update photo mounting prices.', size_selected;
    end if;
  end if;

  return amount;
end;
$$;

revoke all on function public.service_option_price(text, jsonb) from public, anon;
grant execute on function public.service_option_price(text, jsonb) to authenticated;
