-- Bakunawa demo seed. Safe to rerun: it clears demo data first.
-- Demo accounts (test values for local and demo projects only; see README "Demo accounts"):
--   citizen@bakunawa.test, citizen2@bakunawa.test, moderator@bakunawa.test,
--   responder@bakunawa.test, admin@bakunawa.test   password: Bakunawa-demo-2026

begin;

-- ---------------------------------------------------------------------------
-- Part 1 (T017): categories and accounts
-- ---------------------------------------------------------------------------

delete from public.incidents;
delete from public.facilities;
delete from public.categories;
delete from auth.users where email like '%@bakunawa.test';

insert into public.categories (id, "group", label, icon, default_severity, sort_order) values
  ('flood',         'natural',       'Flood',                  'flood',    'high',     10),
  ('earthquake',    'natural',       'Earthquake',             'activity', 'high',     20),
  ('typhoon',       'natural',       'Typhoon / Storm',        'wind',     'high',     30),
  ('landslide',     'natural',       'Landslide',              'mountain', 'high',     40),
  ('volcano',       'natural',       'Volcanic activity',      'mountain', 'critical', 50),
  ('tsunami',       'natural',       'Tsunami',                'flood',    'critical', 60),
  ('fire',          'human_induced', 'Fire',                   'fire',     'high',     70),
  ('chemical',      'human_induced', 'Chemical leak',          'flask',    'critical', 80),
  ('structural',    'human_induced', 'Structural collapse',    'alert',    'high',     90),
  ('accident',      'human_induced', 'Road accident',          'alert',    'moderate', 100),
  ('security',      'human_induced', 'Security threat',        'shield',   'moderate', 110),
  ('closure',       'community',     'Road closure',           'barrier',  'moderate', 120),
  ('damaged',       'community',     'Damaged infrastructure', 'alert',    'moderate', 130),
  ('affected_area', 'community',     'Affected area',          'layers',   'high',     140);

-- Auth users with fixed ids so later seed parts and tests can reference them.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('Bakunawa-demo-2026', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', u.name, 'phone', u.phone),
  now(), now(), '', '', '', ''
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'citizen@bakunawa.test',   'Maria Santos',     '09171234501'),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'citizen2@bakunawa.test',  'Jose Reyes',       '09171234502'),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'moderator@bakunawa.test', 'Mod. Ana Cruz',    '09171234503'),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'responder@bakunawa.test', 'Resp. Leo Garcia', '09171234504'),
  ('55555555-5555-4555-8555-555555555555'::uuid, 'admin@bakunawa.test',     'Admin Bea Lim',    '09171234505')
) as u(id, email, name, phone);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email like '%@bakunawa.test';

-- Profiles are created by the on_auth_user_created trigger; set roles here.
update public.profiles set role = 'moderator' where id = '33333333-3333-4333-8333-333333333333';
update public.profiles set role = 'responder' where id = '44444444-4444-4444-8444-444444444444';
update public.profiles set role = 'admin'     where id = '55555555-5555-4555-8555-555555555555';
update public.profiles set show_name = true   where id = '11111111-1111-4111-8111-111111111111';

commit;
