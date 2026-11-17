-- Editable service and portfolio imagery, with public reads and admin-only writes.
alter table public.services add column if not exists image_url text;

create table if not exists public.portfolio_projects (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  category text not null,
  client text,
  summary text not null,
  description text not null,
  services text[] not null default '{}',
  image_url text not null,
  gallery_images text[] not null default '{}',
  link_url text,
  link_label text,
  illustrative boolean not null default false,
  featured boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_portfolio_projects_updated_at on public.portfolio_projects;
create trigger set_portfolio_projects_updated_at before update on public.portfolio_projects
for each row execute function public.set_updated_at();

alter table public.portfolio_projects enable row level security;
drop policy if exists portfolio_projects_public_read on public.portfolio_projects;
create policy portfolio_projects_public_read on public.portfolio_projects for select to anon, authenticated using (is_active or public.has_any_role(array['admin']::public.app_role[]));
drop policy if exists portfolio_projects_admin_manage on public.portfolio_projects;
create policy portfolio_projects_admin_manage on public.portfolio_projects for all to authenticated
using (public.has_any_role(array['admin']::public.app_role[]))
with check (public.has_any_role(array['admin']::public.app_role[]));

insert into public.portfolio_projects
  (slug,title,category,client,summary,description,services,image_url,gallery_images,link_url,link_label,illustrative,featured,sort_order)
values
('rebearth-solutions-website','Rebearth Solutions website & marketing materials','digital','Rebearth Solutions','A clean, modern website and branded marketing materials.','Website design and development together with branded marketing materials, built to capture the Rebearth Solutions identity and present it consistently online and in print.',array['website-software','graphic-design'],'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=85','{}','https://rebearthsolutions.co.ke','rebearthsolutions.co.ke',false,true,10),
('stetech-solar-website','STETECH Solar Technology website redesign','digital','STETECH Solar Technology','A website redesign and brand refresh for a clean-energy company.','A redesign of the STETECH Solar Technology website and an elevated brand presentation for the clean-energy sector, focused on credibility and client engagement.',array['website-software','graphic-design'],'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85','{}','https://stetechsolartechnology.co.ke','stetechsolartechnology.co.ke',false,true,20),
('corporate-branding-package','Corporate branding package','branding',null,'Logo, business cards, letterheads and brand guidelines.','Complete corporate identity design including logo, business cards, letterheads and comprehensive brand guidelines for consistent brand application.',array['graphic-design'],'https://images.pexels.com/photos/6177607/pexels-photo-6177607.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',array['https://images.pexels.com/photos/6476589/pexels-photo-6476589.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750','https://images.pexels.com/photos/6476808/pexels-photo-6476808.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'],null,null,true,true,30),
('promotional-banners','Promotional banners','print',null,'Weather-resistant large-format banners for an outdoor campaign.','Large-format banner printing for an outdoor marketing campaign with weather-resistant materials and eye-catching designs that drive engagement.',array['banner-printing','graphic-design'],'https://images.pexels.com/photos/7821954/pexels-photo-7821954.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',array['https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750','https://images.pexels.com/photos/163064/play-stone-network-cobweb-163064.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'],null,null,true,true,40),
('event-t-shirts','Event T-shirts','print',null,'Custom-designed, printed T-shirts for a corporate event.','Custom designed and printed T-shirts for a major corporate event with over 500 participants, featuring premium quality materials and vibrant colours.',array['graphic-design'],'https://images.pexels.com/photos/5698854/pexels-photo-5698854.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',array['https://images.pexels.com/photos/8532616/pexels-photo-8532616.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750','https://images.pexels.com/photos/8532614/pexels-photo-8532614.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'],null,null,true,false,50),
('product-packaging','Product packaging','packaging',null,'Boxes and labels for a premium skincare line.','Custom packaging design for a premium skincare product line, including elegant boxes, labels and sustainable packaging solutions.',array['graphic-design','sticker-printing'],'https://images.pexels.com/photos/5947026/pexels-photo-5947026.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',array['https://images.pexels.com/photos/4465124/pexels-photo-4465124.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750','https://images.pexels.com/photos/4465831/pexels-photo-4465831.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'],null,null,true,false,60),
('memorial-program','Memorial programme','print',null,'A respectful, elegantly finished eulogy programme.','Thoughtfully designed eulogy programme with custom typography, elegant finishing and a respectful layout to honour cherished memories.',array['graphic-design'],'https://images.pexels.com/photos/7319294/pexels-photo-7319294.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',array['https://images.pexels.com/photos/1615776/pexels-photo-1615776.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750','https://images.pexels.com/photos/1615777/pexels-photo-1615777.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'],null,null,true,false,70),
('corporate-stationery','Corporate stationery','branding',null,'Business cards, letterheads, envelopes and folders.','Complete stationery design suite including business cards, letterheads, envelopes and folders with consistent brand application.',array['graphic-design'],'https://images.pexels.com/photos/6375/quote-chalk-think-words.jpg?auto=compress&cs=tinysrgb&w=1260&h=750',array['https://images.pexels.com/photos/6437491/pexels-photo-6437491.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750','https://images.pexels.com/photos/6476808/pexels-photo-6476808.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'],null,null,true,false,80)
on conflict (slug) do nothing;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('site-media','site-media',true,8388608,array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update set public=true,file_size_limit=8388608,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists site_media_public_read on storage.objects;
create policy site_media_public_read on storage.objects for select to anon, authenticated using (bucket_id='site-media');
drop policy if exists site_media_admin_insert on storage.objects;
create policy site_media_admin_insert on storage.objects for insert to authenticated with check (bucket_id='site-media' and public.has_any_role(array['admin']::public.app_role[]));
drop policy if exists site_media_admin_update on storage.objects;
create policy site_media_admin_update on storage.objects for update to authenticated using (bucket_id='site-media' and public.has_any_role(array['admin']::public.app_role[])) with check (bucket_id='site-media' and public.has_any_role(array['admin']::public.app_role[]));
drop policy if exists site_media_admin_delete on storage.objects;
create policy site_media_admin_delete on storage.objects for delete to authenticated using (bucket_id='site-media' and public.has_any_role(array['admin']::public.app_role[]));
