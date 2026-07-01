-- ============================================================================
-- TournamentPal — Staff & roles + sponsors RLS regression test
-- ============================================================================
-- Verifies least-privilege for staff: a scorekeeper can post scores but cannot
-- manage the event; outsiders are locked out; sponsors are publicly readable.
-- Runs in a transaction and ROLLS BACK. Raises (non-zero exit) on failure.
--   psql "$SUPABASE_DB_URL" -f supabase/tests/rls_staff.test.sql
-- ============================================================================

begin;
create temp table r(name text, pass boolean) on commit drop;
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
 ('d1111111-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dir@t.dev','x',now(),now()),
 ('50000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','authenticated','authenticated','s@t.dev','x',now(),now()),
 ('000000aa-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','authenticated','authenticated','out@t.dev','x',now(),now());
insert into public.tournaments (id, director_id, name, status) values
 ('7b111111-0000-0000-0000-000000000000','d1111111-0000-0000-0000-000000000000','Cup','published');
insert into public.teams (id, tournament_id, name) values
 ('7b111111-0000-0000-0000-000000000a01','7b111111-0000-0000-0000-000000000000','T1'),
 ('7b111111-0000-0000-0000-000000000a02','7b111111-0000-0000-0000-000000000000','T2');
insert into public.games (id, tournament_id, stage, round, home_team_id, away_team_id, status) values
 ('90000000-0000-0000-0000-000000000000','7b111111-0000-0000-0000-000000000000','pool',1,
  '7b111111-0000-0000-0000-000000000a01','7b111111-0000-0000-0000-000000000a02','scheduled');
insert into public.sponsors (tournament_id, name) values ('7b111111-0000-0000-0000-000000000000','Grill');

do $$
declare v boolean; res text;
begin
  set local role authenticated; set local request.jwt.claims = '{"sub":"d1111111-0000-0000-0000-000000000000","role":"authenticated"}';
  res := public.add_staff_by_email('7b111111-0000-0000-0000-000000000000','s@t.dev','scorekeeper');
  reset role; insert into r values ('add_staff_by_email ok', res = 'ok');

  set local role authenticated; set local request.jwt.claims = '{"sub":"50000000-0000-0000-0000-000000000000","role":"authenticated"}';
  v := public.can_score('7b111111-0000-0000-0000-000000000000');
  reset role; insert into r values ('scorekeeper can_score', v);
  set local role authenticated; set local request.jwt.claims = '{"sub":"000000aa-0000-0000-0000-000000000000","role":"authenticated"}';
  v := public.can_score('7b111111-0000-0000-0000-000000000000');
  reset role; insert into r values ('outsider cannot can_score', v = false);

  set local role authenticated; set local request.jwt.claims = '{"sub":"50000000-0000-0000-0000-000000000000","role":"authenticated"}';
  update public.games set home_score=5, away_score=3, status='final' where id='90000000-0000-0000-0000-000000000000';
  reset role;
  insert into r values ('scorekeeper posts score',
    (select status='final' and home_score=5 from public.games where id='90000000-0000-0000-0000-000000000000'));

  set local role authenticated; set local request.jwt.claims = '{"sub":"000000aa-0000-0000-0000-000000000000","role":"authenticated"}';
  update public.games set home_score=99 where id='90000000-0000-0000-0000-000000000000';
  reset role;
  insert into r values ('outsider blocked from scoring',
    (select home_score=5 from public.games where id='90000000-0000-0000-0000-000000000000'));

  set local role authenticated; set local request.jwt.claims = '{"sub":"50000000-0000-0000-0000-000000000000","role":"authenticated"}';
  update public.tournaments set name='hijacked' where id='7b111111-0000-0000-0000-000000000000';
  reset role;
  insert into r values ('scorekeeper cannot rename event',
    (select name='Cup' from public.tournaments where id='7b111111-0000-0000-0000-000000000000'));

  set local role authenticated; set local request.jwt.claims = '{"sub":"50000000-0000-0000-0000-000000000000","role":"authenticated"}';
  delete from public.tournaments where id='7b111111-0000-0000-0000-000000000000';
  reset role;
  insert into r values ('scorekeeper cannot delete event',
    (select count(*)=1 from public.tournaments where id='7b111111-0000-0000-0000-000000000000'));

  set local role anon;
  v := (select count(*)=1 from public.sponsors where tournament_id='7b111111-0000-0000-0000-000000000000');
  reset role; insert into r values ('anon reads sponsors', v);
end$$;

select name, pass from r order by pass, name;

do $$
begin
  if exists (select 1 from r where not pass) then
    raise exception 'Staff/roles RLS test FAILED — see the result set above';
  end if;
  raise notice 'Staff/roles RLS test: ALL % checks passed', (select count(*) from r);
end$$;

rollback;
