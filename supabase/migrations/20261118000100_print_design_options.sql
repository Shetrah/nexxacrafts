-- Add optional design assistance questions to existing banner and sticker forms.
-- Price the design scope through Services > edit service > option prices.
do $$
declare
  svc record;
  additions jsonb;
  merged_fields jsonb;
begin
  for svc in
    select slug, coalesce(fields, '[]'::jsonb) as fields
    from public.services
    where slug in ('banner-printing', 'sticker-printing')
  loop
    if svc.slug = 'banner-printing' then
      additions := '[
        {"name":"artwork","label":"Artwork status","type":"select","required":true,"options":["Print-ready artwork available","Need design assistance"]},
        {"name":"design_service","label":"Design assistance","type":"select","required":true,"options":["Simple text and logo layout","Promotional banner design","Custom branded campaign design"],"optionPrices":{"Simple text and logo layout":0,"Promotional banner design":0,"Custom branded campaign design":0},"help":"The design fee is added to the banner total.","showWhen":{"field":"artwork","equals":"Need design assistance"}},
        {"name":"design_brief","label":"Design brief","type":"textarea","required":true,"help":"Describe the message, audience, preferred colours, wording, and any logos or references.","showWhen":{"field":"artwork","equals":"Need design assistance"}},
        {"name":"design_references","label":"Logo or design references","type":"file","accept":"image/*,.pdf,.zip,.ai,.svg","maxSizeMb":100,"multiple":true,"help":"Attach logos, inspiration images, or supporting material for the designer.","showWhen":{"field":"artwork","equals":"Need design assistance"}},
        {"name":"design_formats","label":"Preferred design or print size details","type":"text","help":"For example: include bleed, preferred layout/orientation, or final file format.","showWhen":{"field":"artwork","equals":"Need design assistance"}}
      ]'::jsonb;
    else
      additions := '[
        {"name":"artwork","label":"Artwork status","type":"select","required":true,"options":["Print-ready artwork available","Need design assistance"]},
        {"name":"design_service","label":"Design assistance","type":"select","required":true,"options":["Simple text and logo layout","Product label design","Custom sticker or campaign design"],"optionPrices":{"Simple text and logo layout":0,"Product label design":0,"Custom sticker or campaign design":0},"help":"The design fee is added to the sticker total.","showWhen":{"field":"artwork","equals":"Need design assistance"}},
        {"name":"design_brief","label":"Design brief","type":"textarea","required":true,"help":"Describe the wording, audience, style, colours, and any logos or references.","showWhen":{"field":"artwork","equals":"Need design assistance"}},
        {"name":"design_references","label":"Logo or design references","type":"file","accept":"image/*,.pdf,.zip,.ai,.svg","maxSizeMb":100,"multiple":true,"help":"Attach logos, inspiration images, or supporting material for the designer.","showWhen":{"field":"artwork","equals":"Need design assistance"}},
        {"name":"design_formats","label":"Preferred design details","type":"text","help":"For example: label shape, orientation, bleed, or final file format.","showWhen":{"field":"artwork","equals":"Need design assistance"}}
      ]'::jsonb;
    end if;

    select coalesce(jsonb_agg(
      case when item.value->>'name' = 'artwork' then
        item.value || jsonb_build_object('required', true)
          || case when item.value->>'type' = 'select' then
            jsonb_build_object('optionPrices', coalesce(item.value->'optionPrices', '{}'::jsonb))
          else '{}'::jsonb end
      else item.value end order by item.ordinality
    ), '[]'::jsonb)
    into merged_fields
    from jsonb_array_elements(svc.fields) with ordinality as item(value, ordinality);

    select merged_fields || coalesce(jsonb_agg(addition.value), '[]'::jsonb)
    into merged_fields
    from jsonb_array_elements(additions) as addition(value)
    where not exists (
      select 1 from jsonb_array_elements(svc.fields) as current_field(value)
      where current_field.value->>'name' = addition.value->>'name'
    );

    update public.services set fields = merged_fields where slug = svc.slug;
  end loop;
end $$;
