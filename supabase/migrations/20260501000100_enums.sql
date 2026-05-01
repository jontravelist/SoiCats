-- Soi Cats: enums

create type user_role as enum ('user', 'feeder', 'clinic_admin', 'app_admin');

create type cat_status as enum ('active', 'injured', 'missing', 'deceased');

create type cat_age_guess as enum ('kitten', 'young', 'adult', 'senior');

create type tnr_status as enum ('unknown', 'intact', 'ear_tipped', 'sterilised');

create type vaccination_status as enum ('unknown', 'partial', 'fully_vaccinated');

create type sighting_status as enum ('confirmed', 'pending_id', 'rejected');

create type flag_type as enum ('injured', 'missing', 'deceased');

create type flag_status as enum ('open', 'verified', 'resolved', 'dismissed');

create type clinic_update_type as enum (
  'vaccination',
  'sterilisation',
  'ear_tip',
  'health_check',
  'other'
);
