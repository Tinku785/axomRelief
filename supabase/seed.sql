-- Demo/dev seed data — mirrors the content used in the design prototype.
-- Safe to run once against a fresh database (supabase db reset runs this
-- automatically). Re-running will duplicate rows since ids are random.

insert into public.helplines (label, phone_number, sort_order) values
  ('Sivasagar Control Room', '8471864355', 1),
  ('Charaideo Control Room', '9085412180', 2),
  ('Jorhat Control Room', '0376-2300124', 3),
  ('Toll free (all districts)', '1077', 4);

insert into public.news_updates (message, created_at) values
  ('Water level at Nanglamuraghat crossing danger mark. Avoid NH-2 near Demow.', now() - interval '40 minutes'),
  ('New relief camp opened at Sonari Higher Secondary School.', now() - interval '200 minutes'),
  ('Medical team stationed at Jorhat Civil Hospital, 24 hrs.', now() - interval '420 minutes'),
  ('SDRF boats deployed at Demow and Teok ghats.', now() - interval '500 minutes');

insert into public.helpers (name, contact_number, areas_covered, what_given, boat_available, map_x, map_y, created_at) values
  ('Rupam Gogoi', '98110 22334', 'Demow, Nazira', 'Boat rescue, drinking water', true, 176, 158, now() - interval '1 day'),
  ('Jorhat Youth Club', '94350 44556', 'Teok, Titabar', 'Cooked food, 200 packets/day', false, 84, 214, now() - interval '1 day'),
  ('Dr. Anupama Das', '90850 77881', 'Sonari, Moran', 'Medical camp, insulin, ORS', false, 276, 196, now() - interval '1 day');

insert into public.requests
  (name, district, location, contact_number, num_people, needs, priority, boat_required, notes, map_x, map_y, hidden, created_at) values
  ('Bhaskar Gogoi', 'Sivasagar', 'Demow', '98640 12345', 6, array['water','food'], 'critical', true,
    'On rooftop, water still rising. Two children.', 200, 138, false, now() - interval '25 minutes'),
  ('Sonari Relief Camp', 'Charaideo', 'Sonari', '99540 23456', 12, array['food','clothes'], 'critical', false,
    'Camp short on food since morning.', 292, 168, false, now() - interval '110 minutes'),
  ('Nirmali Bora', 'Sivasagar', 'Nazira', '87220 34567', 4, array['medical'], 'urgent', false,
    'Elderly diabetic, insulin needed.', 212, 182, false, now() - interval '70 minutes'),
  ('Teok Ward 3', 'Jorhat', 'Teok', '96780 45678', 8, array['food','sanitation'], 'urgent', true,
    '', 96, 190, false, now() - interval '180 minutes'),
  ('Pranab Saikia', 'Charaideo', 'Moran', '70020 56789', 3, array['water'], 'needed', false,
    '', 262, 226, false, now() - interval '300 minutes'),
  ('Titabar Colony', 'Jorhat', 'Titabar', '88110 67890', 5, array['clothes'], 'needed', false,
    'Dry clothes for kids.', 74, 238, true, now() - interval '480 minutes');
