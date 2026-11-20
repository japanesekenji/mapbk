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

-- ---------------------------------------------------------------------------
-- Part 2 (T029): Metro Manila incidents and facilities
-- ---------------------------------------------------------------------------

insert into public.incidents (
  category_id, title, description, location, place_name, severity, status,
  reporter_id, corroboration_count, reported_at, location_accuracy_m
)
select
  d.cat, d.title, d.descr,
  extensions.st_setsrid(extensions.st_makepoint(d.lng, d.lat), 4326)::extensions.geography,
  d.place, d.sev::public.severity, d.st::public.incident_status,
  case when d.n % 2 = 0 then '11111111-1111-4111-8111-111111111111'::uuid
       else '22222222-2222-4222-8222-222222222222'::uuid end,
  d.corr, now() - make_interval(mins => d.mins), 8 + (d.n % 20)
from (values
  ( 1, 'flood',      'Flooding in Brgy. Tatalon',             'Knee-deep water along Tatalon Ave. Two lanes impassable.',                     14.6219, 121.0146, 'Brgy. Tatalon, Quezon City',     'critical', 'verified', 24,   18),
  ( 2, 'fire',       'Structure fire, Brgy. Kapitolyo',       'Residential fire reported near the main road. Fire trucks requested.',         14.5717, 121.0590, 'Brgy. Kapitolyo, Pasig City',    'high',     'pending',   6,   34),
  ( 3, 'landslide',  'Landslide, Marikina-Infanta Hwy',       'Soil and debris covering one lane. Traffic slowed.',                           14.6385, 121.1205, 'Marikina-Infanta Hwy, Antipolo', 'moderate', 'pending',   3,  120),
  ( 4, 'structural', 'Partial building collapse, Binondo',    'Upper floor of an old commercial building has collapsed. Area cordoned off.',  14.5995, 120.9742, 'Binondo, Manila',                'high',     'verified', 11,   55),
  ( 5, 'closure',    'Road closure, C5 southbound',           'C5 southbound is closed near Bonifacio Global City because of flooding.',      14.5408, 121.0560, 'C5, Taguig City',                'moderate', 'pending',   5,   60),
  ( 6, 'chemical',   'Chemical leak, warehouse',              'Strong fumes reported near a warehouse. Residents advised to stay indoors.',   14.5200, 121.0500, 'Brgy. Ususan, Taguig City',      'critical', 'pending',   9,   47),
  ( 7, 'earthquake', 'Magnitude 4.2 aftershock felt',         'Light shaking reported. No damage confirmed.',                                 14.6000, 121.1700, 'Antipolo, Rizal',                'low',      'resolved', 14,  180),
  ( 8, 'flood',      'Street flooding near Espana Blvd',      'Gutter-deep water near UST. Passable for large vehicles only.',                14.6096, 120.9890, 'Sampaloc, Manila',               'moderate', 'verified',  8,   25),
  ( 9, 'flood',      'Rising water at Marikina River',        'River level at second alarm. Riverside residents preparing to evacuate.',      14.6331, 121.0965, 'Brgy. Tumana, Marikina City',    'critical', 'verified', 31,   12),
  (10, 'flood',      'Flooded underpass, Quezon Ave',         'Underpass flooded about 1 m deep. Cars stalled.',                              14.6340, 121.0210, 'Quezon Ave, Quezon City',        'high',     'pending',   4,   40),
  (11, 'typhoon',    'Strong winds tearing roofs',            'Several GI sheet roofs blown off along the coastal road.',                     14.5235, 120.9930, 'Baclaran, Paranaque City',       'high',     'verified', 12,   90),
  (12, 'typhoon',    'Uprooted tree blocking road',           'Large acacia tree fell across both lanes. MMDA notified.',                     14.5869, 121.0614, 'Ortigas Center, Pasig City',     'moderate', 'resolved',  7,  300),
  (13, 'fire',       'Grass fire near railway',               'Small grass fire beside the PNR tracks. Smoke visible.',                       14.5560, 121.0020, 'Pasay City',                     'low',      'resolved',  2,  600),
  (14, 'fire',       'Fire at public market stalls',          'Fire spreading among market stalls. Fourth alarm raised.',                     14.6543, 120.9840, 'Malabon City',                   'critical', 'verified', 19,   70),
  (15, 'accident',   'Multi-vehicle collision on EDSA',       'Bus and two cars collided near Guadalupe. One lane open.',                     14.5666, 121.0457, 'EDSA Guadalupe, Makati City',    'moderate', 'verified',  9,   35),
  (16, 'accident',   'Motorcycle crash, Commonwealth Ave',    'Rider injured. Ambulance on site.',                                            14.6760, 121.0870, 'Commonwealth Ave, Quezon City',  'moderate', 'pending',   1,   22),
  (17, 'security',   'Reported looting of evacuated homes',   'Residents report break-ins in evacuated houses along the creek.',              14.6615, 121.0012, 'Caloocan City',                  'moderate', 'pending',   2,  150),
  (18, 'security',   'Suspicious package at terminal',        'Bomb squad responded. Area cleared, item was harmless.',                       14.5520, 121.0280, 'Buendia, Makati City',           'low',      'resolved',  6,  800),
  (19, 'structural', 'Cracks on footbridge',                  'Visible cracks on pedestrian bridge after aftershock. Avoid until inspected.', 14.6510, 121.0330, 'North Ave, Quezon City',         'high',     'pending',   3,  200),
  (20, 'damaged',    'Collapsed drainage culvert',            'Road surface caved in over a drainage culvert. Barricades up.',                14.5770, 121.0950, 'Brgy. Santolan, Pasig City',     'moderate', 'verified',  5,  260),
  (21, 'damaged',    'Downed power lines',                    'Live wires on the sidewalk after strong winds. Meralco notified.',             14.5940, 121.0180, 'Sta. Mesa, Manila',              'high',     'verified', 10,   85),
  (22, 'closure',    'Bridge closed for inspection',          'Marcos Bridge closed both ways pending structural inspection.',                14.6278, 121.0885, 'Marikina City',                  'high',     'verified', 16,   95),
  (23, 'closure',    'Road closed, Roxas Blvd service road',  'Service road closed due to storm surge debris.',                               14.5580, 120.9850, 'Roxas Blvd, Pasay City',         'moderate', 'resolved',  4, 1300),
  (24, 'landslide',  'Soil erosion along creek',              'Creek bank eroding behind houses. Families moved out.',                        14.6870, 121.1050, 'Payatas, Quezon City',           'high',     'pending',   2,  330),
  (25, 'earthquake', 'Wall cracks after tremor',              'Hairline cracks on a school wall. Classes suspended for inspection.',          14.6060, 121.0800, 'Cainta, Rizal',                  'low',      'pending',   1,  420),
  (26, 'chemical',   'Fuel spill after crash',                'Tanker spilled diesel on the road. Fire crew applying absorbent.',             14.5100, 121.0300, 'Bicutan, Taguig City',           'high',     'verified',  7,  140),
  (27, 'flood',      'Flooding in Brgy. Malanday',            'Waist-deep water inside the barangay. Rescue boats deployed.',                 14.6440, 121.0960, 'Brgy. Malanday, Marikina City',  'critical', 'verified', 27,   30),
  (28, 'flood',      'Flood subsided, Bagong Silangan',       'Water has receded. Clean-up ongoing.',                                         14.6920, 121.1110, 'Bagong Silangan, Quezon City',   'low',      'resolved',  9, 2000),
  (29, 'fire',       'Electrical fire, condominium',          'Fire contained to one unit. Residents allowed back.',                          14.5520, 121.0500, 'BGC, Taguig City',               'moderate', 'resolved',  5, 5000),
  (30, 'typhoon',    'Signage blown onto road',               'Billboard frame fell onto the outer lane.',                                    14.6280, 121.0570, 'Cubao, Quezon City',             'moderate', 'pending',   2,   65),
  (31, 'accident',   'Jeepney overturned',                    'Jeepney overturned on a flooded street. Passengers rescued.',                  14.6180, 121.0600, 'Aurora Blvd, Quezon City',       'high',     'pending',   3,   15),
  (32, 'damaged',    'Damaged seawall',                       'Section of seawall broken by waves. Area off limits.',                         14.6000, 120.9600, 'Tondo, Manila',                  'high',     'pending',   2,  500),
  (33, 'structural', 'Old church facade damaged',             'Bell tower stones fell during the tremor. Cordoned off.',                      14.5890, 120.9750, 'Intramuros, Manila',             'moderate', 'resolved',  8, 9000),
  (34, 'flood',      'Flash flood warning, San Mateo',        'River rising fast. Residents near the bank urged to move to higher ground.',   14.6970, 121.1220, 'San Mateo, Rizal',               'high',     'pending',   4,    8),
  (35, 'security',   'Road rage incident, traffic blocked',   'Police on scene. Traffic moving again.',                                       14.5860, 121.0560, 'Shaw Blvd, Mandaluyong City',    'low',      'verified',  1,  110),
  (36, 'landslide',  'Rockfall on mountain road',             'Rocks on the road after heavy rain. Single lane passable.',                    14.6000, 121.2000, 'Tanay, Rizal',                   'moderate', 'verified',  3,  700),
  (37, 'closure',    'Ortigas Ave extension closed',          'Closed due to flooding near Rosario bridge.',                                  14.5880, 121.0890, 'Rosario, Pasig City',            'moderate', 'pending',   2,   45),
  (38, 'fire',       'Warehouse fire, Valenzuela',            'Large fire at a plastics warehouse. Thick black smoke.',                        14.7000, 120.9830, 'Valenzuela City',                'critical', 'pending',   5,   28)
) as d(n, cat, title, descr, lat, lng, place, sev, st, corr, mins);

-- Affected areas drawn as polygons (FR-014).
insert into public.incidents (
  category_id, title, description, location, area, place_name, severity, status,
  reporter_id, corroboration_count, reported_at
) values
  ('affected_area', 'Flood-affected area, Marikina riverbanks',
   'Low-lying barangays along the Marikina River are flooded. Forced evacuation in effect.',
   extensions.st_setsrid(extensions.st_makepoint(121.0985, 14.6390), 4326)::extensions.geography,
   extensions.st_geomfromtext('POLYGON((121.088 14.652, 121.106 14.652, 121.110 14.630, 121.094 14.622, 121.086 14.636, 121.088 14.652))', 4326)::extensions.geography,
   'Marikina City', 'critical', 'verified', '33333333-3333-4333-8333-333333333333', 21, now() - interval '40 minutes'),
  ('affected_area', 'Power outage area, Pasig',
   'Several barangays without power after downed lines. Restoration under way.',
   extensions.st_setsrid(extensions.st_makepoint(121.0760, 14.5720), 4326)::extensions.geography,
   extensions.st_geomfromtext('POLYGON((121.066 14.582, 121.086 14.582, 121.088 14.564, 121.068 14.562, 121.066 14.582))', 4326)::extensions.geography,
   'Pasig City', 'moderate', 'pending', '11111111-1111-4111-8111-111111111111', 4, now() - interval '2 hours');

insert into public.facilities (
  name, type, location, address, contact_phone, capacity, status, status_updated_at
)
select
  f.name, f.type::public.facility_type,
  extensions.st_setsrid(extensions.st_makepoint(f.lng, f.lat), 4326)::extensions.geography,
  f.addr, f.phone, f.cap, f.st::public.facility_status,
  case when f.hrs is null then null else now() - make_interval(hours => f.hrs) end
from (values
  ('Bagong Ilog Evacuation Center',     'evacuation_center', 14.5650, 121.0710, 'Brgy. Bagong Ilog, Pasig City', '02 8643 1111', 400,       'open',    2),
  ('Tumana Covered Court',              'evacuation_center', 14.6355, 121.0990, 'Brgy. Tumana, Marikina City',   '02 8646 2222', 250,       'full',    1),
  ('Malanday Elementary School',        'evacuation_center', 14.6455, 121.0930, 'Brgy. Malanday, Marikina City', '02 8646 3333', 600,       'open',    3),
  ('Tatalon Barangay Hall Gym',         'evacuation_center', 14.6200, 121.0170, 'Brgy. Tatalon, Quezon City',    '02 8712 4444', 180,       'open',    5),
  ('Quezon City Hall Grounds',          'evacuation_center', 14.6466, 121.0503, 'Elliptical Rd, Quezon City',    '122',          1000,      'open',   30),
  ('Taguig Science High School',        'evacuation_center', 14.5300, 121.0640, 'Brgy. Ususan, Taguig City',     '02 8642 5555', 350,       'closed', 48),
  ('Payatas Multi-Purpose Hall',        'evacuation_center', 14.7010, 121.0980, 'Payatas, Quezon City',          null,           200,       'unknown', null),
  ('Pasig City General Hospital',       'hospital',          14.5700, 121.0830, 'Pasig City',                    '02 8643 6666', null::int, 'open',    4),
  ('East Avenue Medical Center',        'hospital',          14.6410, 121.0480, 'East Ave, Quezon City',         '02 8928 0611', null,      'open',    6),
  ('Philippine General Hospital',       'hospital',          14.5780, 120.9860, 'Taft Ave, Manila',              '02 8554 8400', null,      'full',    2),
  ('Amang Rodriguez Medical Center',    'hospital',          14.6330, 121.1010, 'Marikina City',                 '02 8941 0342', null,      'open',   26),
  ('Taguig-Pateros District Hospital',  'hospital',          14.5160, 121.0590, 'Taguig City',                   '02 8838 2525', null,      'open',   10),
  ('Makati Police Station',             'police_station',    14.5560, 121.0230, 'Makati City',                   '02 8899 1234', null,      'open',    6),
  ('QCPD Station 9, Anonas',            'police_station',    14.6280, 121.0640, 'Anonas, Quezon City',           '02 8434 5678', null,      'open',   12),
  ('Pasig City Police Station',         'police_station',    14.5600, 121.0800, 'Pasig City',                    '02 8642 9999', null,      'unknown', null),
  ('Marikina Fire Station',             'fire_station',      14.6360, 121.1000, 'Marikina City',                 '02 8646 0000', null,      'open',    3),
  ('Manila Fire District, Sta. Cruz',   'fire_station',      14.6170, 120.9840, 'Sta. Cruz, Manila',             '02 8527 3653', null,      'open',    8),
  ('Taguig Central Fire Station',       'fire_station',      14.5280, 121.0700, 'Taguig City',                   '02 8642 1111', null,      'open',   30),
  ('Marikina Rescue 161',               'rescue_station',    14.6500, 121.1020, 'Marikina City',                 '161',          null,      'open',    1),
  ('QC Disaster Risk Reduction Office', 'rescue_station',    14.6480, 121.0490, 'Quezon City Hall, Quezon City', '122',          null,      'open',    2),
  ('Pasig Rescue Command Center',       'rescue_station',    14.5760, 121.0850, 'Pasig City',                    '02 8643 0000', null,      'open',    5),
  ('Marikina Sports Center Relief Hub', 'relief_center',     14.6370, 121.0960, 'Sumulong Hwy, Marikina City',   null,           null,      'open',    4),
  ('DSWD NCR Relief Warehouse',         'relief_center',     14.6000, 121.0100, 'Legarda, Manila',               '02 8734 8622', null,      'open',   20),
  ('Taguig Relief Distribution Point',  'relief_center',     14.5230, 121.0530, 'Taguig City',                   null,           null,      'closed', 40),
  ('Red Cross Pasig Chapter',           'relief_center',     14.5760, 121.0700, 'Pasig City',                    '143',          null,      'open',    7)
) as f(name, type, lat, lng, addr, phone, cap, st, hrs);

-- ---------------------------------------------------------------------------
-- Part 3 (T057): sample SOS requests (responders and admins only)
-- ---------------------------------------------------------------------------

delete from public.sos_requests;

insert into public.sos_requests (
  sender_id, sender_kind, contact_phone, type, location, location_accuracy_m, landmark,
  people_count, notes, state, assigned_to, tracking_token_hash, device_id, created_at, state_updated_at
)
select
  s.sender, case when s.sender is null then 'visitor' else 'user' end, s.phone, s.type::public.sos_type,
  case when s.lat is null then null
       else extensions.st_setsrid(extensions.st_makepoint(s.lng, s.lat), 4326)::extensions.geography end,
  s.acc, s.landmark, s.people, s.notes, s.state::public.sos_state, s.assigned,
  encode(extensions.digest('seed-sos-' || s.n, 'sha256'), 'hex'), 'seed-device-' || s.n,
  now() - make_interval(mins => s.mins), now() - make_interval(mins => greatest(s.mins - 5, 0))
from (values
  (1, null::uuid, '09181110001', 'trapped_flood', 14.6420, 121.0950, 8, null::text, 4, 'Two seniors, one child. Second floor, water rising.', 'new', null::uuid, 6),
  (2, '11111111-1111-4111-8111-111111111111'::uuid, '09171234501', 'medical', 14.6230, 121.0160, 12, null, 1, 'Diabetic neighbor, insulin ran out.', 'acknowledged', '44444444-4444-4444-8444-444444444444'::uuid, 25),
  (3, null, '09181110003', 'fire', 14.5720, 121.0600, 20, null, 6, 'Fire next door, smoke entering house.', 'responding', '44444444-4444-4444-8444-444444444444'::uuid, 40),
  (4, '22222222-2222-4222-8222-222222222222'::uuid, '09171234502', 'other', null, null, null, 'Behind Malanday Elementary School, blue gate', 3, 'Roof damaged, need tarps.', 'new', null, 12),
  (5, null, '09181110005', 'trapped_flood', 14.6340, 121.0990, 15, null, 2, 'Rescued by barangay boat.', 'closed', '44444444-4444-4444-8444-444444444444'::uuid, 180)
) as s(n, sender, phone, type, lat, lng, acc, landmark, people, notes, state, assigned, mins);

commit;
