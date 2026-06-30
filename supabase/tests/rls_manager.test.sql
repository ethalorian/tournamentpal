-- ============================================================================
-- TournamentPal — Team-manager + messaging RLS regression test
-- ============================================================================
-- Verifies the authorization boundary for the third persona: claiming a team
-- and director<->manager messaging. Runs in a transaction and ROLLS BACK.
--   psql "$SUPABASE_DB_URL" -f supabase/tests/rls_manager.test.sql
-- Raises (non-zero exit) on any failure.
-- ============================================================================

begin;
create temp table r(name text, pass boolean) on commit drop;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
 ('d0000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','authenticated','authenticated','d@t.dev','x',now(),now()),
 ('30000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','authenticated','authenticated','m@t.dev','x',now(),now()),
 ('e0000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','authenticated','authenticated','n@t.dev','x',now(),now());
insert into public.tournaments (id, director_id, name, status) values
 ('7a000000-0000-0000-0000-000000000000','d0000000-0000-0000-0000-000000000000','TA','published');
insert into public.teams (id, tournament_id, name) values
 ('71000000-0000-0000-0000-000000000000','7a000000-0000-0000-0000-000000000000','T1'),
 ('72000000-0000-0000-0000-000000000000','7a000000-0000-0000-0000-000000000000','T2');

do $$
declare v boolean; mgr uuid;
begin
  set local role authenticated; set local request.jwt.claims = '{"sub":"30000000-0000-0000-0000-000000000000","role":"authenticated"}';
  perform public.claim_team('71000000-0000-0000-0000-000000000000');
  reset role;
  mgr := (select manager_id from public.teams where id='71000000-0000-0000-0000-000000000000');
  insert into r values ('M claimed T1', mgr = '30000000-0000-0000-0000-000000000000');

  set local role authenticated; set local request.jwt.claims = '{"sub":"30000000-0000-0000-0000-000000000000","role":"authenticated"}';
  v := (select count(*)=1 from public.tournaments where id='7a000000-0000-0000-0000-000000000000');
  reset role; insert into r values ('M reads own tournament', v);

  set local role authenticated; set local request.jwt.claims = '{"sub":"30000000-0000-0000-0000-000000000000","role":"authenticated"}';
  begin insert into public.messages (tournament_id,team_id,sender_id,sender_role,body)
    values ('7a000000-0000-0000-0000-000000000000','71000000-0000-0000-0000-000000000000','30000000-0000-0000-0000-000000000000','manager','hi'); v := true;
  exception when others then v := false; end;
  reset role; insert into r values ('M posts to own thread', v);

  set local role authenticated; set local request.jwt.claims = '{"sub":"30000000-0000-0000-0000-000000000000","role":"authenticated"}';
  begin insert into public.messages (tournament_id,team_id,sender_id,sender_role,body)
    values ('7a000000-0000-0000-0000-000000000000','72000000-0000-0000-0000-000000000000','30000000-0000-0000-0000-000000000000','manager','x'); v := false;
  exception when others then v := true; end;
  reset role; insert into r values ('M blocked from other team thread', v);

  set local role authenticated; set local request.jwt.claims = '{"sub":"e0000000-0000-0000-0000-000000000000","role":"authenticated"}';
  v := (select count(*)=0 from public.messages where team_id='71000000-0000-0000-0000-000000000000');
  reset role; insert into r values ('N cannot read M thread', v);

  set local role authenticated; set local request.jwt.claims = '{"sub":"d0000000-0000-0000-0000-000000000000","role":"authenticated"}';
  v := (select count(*)>=1 from public.messages where team_id='71000000-0000-0000-0000-000000000000');
  reset role; insert into r values ('director reads thread', v);

  set local role authenticated; set local request.jwt.claims = '{"sub":"d0000000-0000-0000-0000-000000000000","role":"authenticated"}';
  begin insert into public.messages (tournament_id,team_id,sender_id,sender_role,body)
    values ('7a000000-0000-0000-0000-000000000000','71000000-0000-0000-0000-000000000000','d0000000-0000-0000-0000-000000000000','director','got it'); v := true;
  exception when others then v := false; end;
  reset role; insert into r values ('director posts to thread', v);

  set local role authenticated; set local request.jwt.claims = '{"sub":"d0000000-0000-0000-0000-000000000000","role":"authenticated"}';
  v := (select count(*)=1 from public.profiles where id='30000000-0000-0000-0000-000000000000');
  reset role; insert into r values ('director reads manager profile', v);

  set local role authenticated; set local request.jwt.claims = '{"sub":"e0000000-0000-0000-0000-000000000000","role":"authenticated"}';
  perform public.claim_team('71000000-0000-0000-0000-000000000000');
  reset role;
  insert into r values ('claimed team cannot be stolen',
    (select manager_id from public.teams where id='71000000-0000-0000-0000-000000000000') = '30000000-0000-0000-0000-000000000000');
end$$;

select name, pass from r order by pass, name;

do $$
begin
  if exists (select 1 from r where not pass) then
    raise exception 'Manager/messaging RLS test FAILED — see the result set above';
  end if;
  raise notice 'Manager/messaging RLS test: ALL % checks passed', (select count(*) from r);
end$$;

rollback;
