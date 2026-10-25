insert into public.app_features(feature_key,route_key,title,category,sort_order)
values('emissionTests','emissionTests','آزمون آلایندگی','engineering',450)
on conflict(feature_key) do nothing;
create table public.emission_tests(
 id text primary key,
 data jsonb not null check(jsonb_typeof(data)='object' and data->>'id'=id),
 revision integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 created_by uuid not null references auth.users(id),
 updated_by uuid not null references auth.users(id)
);
alter table public.emission_tests enable row level security;
create policy emission_read on public.emission_tests for select to authenticated using(public.can_access_feature('emissionTests','view'));
create policy emission_create on public.emission_tests for insert to authenticated with check(public.can_access_feature('emissionTests','create') and created_by=(select auth.uid()) and updated_by=(select auth.uid()));
create policy emission_edit on public.emission_tests for update to authenticated using(public.can_access_feature('emissionTests','edit')) with check(public.can_access_feature('emissionTests','edit') and updated_by=(select auth.uid()));
create policy emission_delete on public.emission_tests for delete to authenticated using(public.can_access_feature('emissionTests','delete'));
grant select,insert,update,delete on public.emission_tests to authenticated;
revoke all on public.emission_tests from anon;
create table public.emission_test_history(
 event_id bigint generated always as identity primary key,
 test_id text not null,
 actor_id uuid references auth.users(id),
 occurred_at timestamptz not null default now(),
 operation text not null,
 revision integer not null,
 before_data jsonb,
 after_data jsonb
);
create index emission_history_test_time on public.emission_test_history(test_id,occurred_at desc);
alter table public.emission_test_history enable row level security;
create policy emission_history_read on public.emission_test_history for select to authenticated using(public.can_access_feature('emissionTests','view'));
grant select on public.emission_test_history to authenticated;
revoke insert,update,delete on public.emission_test_history from authenticated,anon;
create function private.emission_stamp() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='INSERT' then
  NEW.created_by:=auth.uid(); NEW.updated_by:=auth.uid(); NEW.revision:=1; NEW.created_at:=clock_timestamp();
 else
  if NEW.id<>OLD.id then raise exception 'Test ID is immutable'; end if;
  NEW.created_by:=OLD.created_by; NEW.created_at:=OLD.created_at; NEW.updated_by:=auth.uid(); NEW.revision:=OLD.revision+1;
 end if;
 NEW.updated_at:=clock_timestamp(); return NEW;
end $$;
create trigger emission_stamp before insert or update on public.emission_tests for each row execute function private.emission_stamp();
create function private.emission_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if TG_OP='DELETE' then
  if not public.can_access_feature('emissionTests','delete') then raise exception 'Access denied'; end if;
  insert into public.emission_test_history(test_id,actor_id,operation,revision,before_data) values(OLD.id,auth.uid(),TG_OP,OLD.revision,OLD.data); return OLD;
 end if;
 if not public.can_access_feature('emissionTests',case when TG_OP='INSERT' then 'create' else 'edit' end) then raise exception 'Access denied'; end if;
 insert into public.emission_test_history(test_id,actor_id,operation,revision,before_data,after_data)
 values(NEW.id,auth.uid(),TG_OP,NEW.revision,case when TG_OP='UPDATE' then OLD.data else null end,NEW.data);
 return NEW;
end $$;
revoke all on function private.emission_stamp() from public,anon,authenticated;
revoke all on function private.emission_audit() from public,anon,authenticated;
create trigger emission_audit after insert or update or delete on public.emission_tests for each row execute function private.emission_audit();
insert into storage.buckets(id,name,public,file_size_limit) values('emission-attachments','emission-attachments',false,52428800) on conflict(id) do nothing;
create policy emission_files_read on storage.objects for select to authenticated using(bucket_id='emission-attachments' and public.can_access_feature('emissionTests','view') and exists(select 1 from public.emission_tests t where t.id=(storage.foldername(name))[1]));
create policy emission_files_insert on storage.objects for insert to authenticated with check(bucket_id='emission-attachments' and public.can_access_feature('emissionTests','edit') and exists(select 1 from public.emission_tests t where t.id=(storage.foldername(name))[1]));

alter table public.emission_tests add constraint emission_id_integrity check (data ? 'id' and length(id)>0 and position('/' in id)=0);
