-- ============================================================================
-- TournamentPal — Auth + Row Level Security regression test
-- ============================================================================
-- Proves the authorization boundary the whole app depends on. This is the test
-- that would have caught the production outage where revoking EXECUTE on the
-- RLS helper functions broke every read for logged-in users.
--
-- It runs entirely inside a transaction and ROLLS BACK, so it leaves no data.
-- It simulates real signed-in users by setting `request.jwt.claims` (what
-- Supabase's auth layer does) so `auth.uid()` resolves per user.
--
-- How to run:
--   psql "$SUPABASE_DB_URL" -f supabase/tests/rls_auth.test.sql
--   # or paste into the Supabase SQL editor
-- Exit code is non-zero (and it raises) if any assertion fails.
-- ============================================================================

begin;
create temp table results(name text, pass boolean) on commit drop;

-- Real auth users (the profile trigger should auto-create public.profiles rows)
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev','x',now(),now()),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.dev','x',now(),now()),
 ('ffffffff-ffff-ffff-ffff-ffffffffffff','00000000-0000-0000-0000-000000000000','authenticated','authenticated','f@test.dev','x',now(),now());

insert into public.tournaments (id, director_id, name, status) values
 ('a1111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','A Published','published'),
 ('d1111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','A Draft','draft');
insert into public.teams (id, tournament_id, name) values
 ('11111111-0000-0000-0000-000000000001','a1111111-1111-1111-1111-111111111111','Pub Team'),
 ('11111111-0000-0000-0000-000000000002','d1111111-1111-1111-1111-111111111111','Draft Team');

do $$
declare v boolean;
begin
  insert into results values
   ('profile trigger created A', (select count(*)=1 from public.profiles where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')),
   ('helper EXECUTE: anon owns_tournament', has_function_privilege('anon','public.owns_tournament(uuid)','EXECUTE')),
   ('helper EXECUTE: authenticated tournament_public', has_function_privilege('authenticated','public.tournament_public(uuid)','EXECUTE'));

  -- ANONYMOUS reader
  set local role anon;
  v := (select count(*)=1 from public.teams where id='11111111-0000-0000-0000-000000000001');
  reset role; insert into results values ('anon reads published team', v);

  set local role anon;
  v := (select count(*)=0 from public.teams where id='11111111-0000-0000-0000-000000000002');
  reset role; insert into results values ('anon cannot read draft team', v);

  set local role anon;
  begin insert into public.teams (tournament_id,name) values ('a1111111-1111-1111-1111-111111111111','Hacker'); v := false;
  exception when others then v := true; end;
  reset role; insert into results values ('anon insert blocked', v);

  -- DIRECTOR B (not the owner)
  set local role authenticated; set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';
  v := (select count(*)=0 from public.tournaments where id='d1111111-1111-1111-1111-111111111111');
  reset role; insert into results values ('B cannot read A draft', v);

  set local role authenticated; set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';
  begin
    update public.tournaments set name='hijacked' where id='a1111111-1111-1111-1111-111111111111';
    v := (select count(*)=0 from public.tournaments where id='a1111111-1111-1111-1111-111111111111' and name='hijacked');
  exception when others then v := true; end;
  reset role; insert into results values ('B cannot update A tournament', v);

  -- DIRECTOR A (the owner)
  set local role authenticated; set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
  v := (select count(*)=1 from public.tournaments where id='d1111111-1111-1111-1111-111111111111');
  reset role; insert into results values ('A reads own draft', v);

  set local role authenticated; set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
  begin insert into public.divisions (tournament_id,name) values ('a1111111-1111-1111-1111-111111111111','16U'); v := true;
  exception when others then v := false; end;
  reset role; insert into results values ('A inserts own division', v);

  -- FOLLOWER F
  set local role authenticated; set local request.jwt.claims = '{"sub":"ffffffff-ffff-ffff-ffff-ffffffffffff","role":"authenticated"}';
  begin insert into public.follows (follower_id,team_id,tournament_id) values ('ffffffff-ffff-ffff-ffff-ffffffffffff','11111111-0000-0000-0000-000000000001','a1111111-1111-1111-1111-111111111111'); v := true;
  exception when others then v := false; end;
  reset role; insert into results values ('follower can follow as self', v);

  set local role authenticated; set local request.jwt.claims = '{"sub":"ffffffff-ffff-ffff-ffff-ffffffffffff","role":"authenticated"}';
  begin insert into public.follows (follower_id,team_id,tournament_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-0000-0000-0000-000000000001','a1111111-1111-1111-1111-111111111111'); v := false;
  exception when others then v := true; end;
  reset role; insert into results values ('follower cannot forge others follow', v);
end$$;

-- Show every assertion, failures first.
select name, pass from results order by pass, name;

-- Fail loudly (non-zero exit) if anything regressed.
do $$
begin
  if exists (select 1 from results where not pass) then
    raise exception 'RLS/auth regression test FAILED — see the result set above';
  end if;
  raise notice 'RLS/auth regression test: ALL % checks passed', (select count(*) from results);
end$$;

rollback;
