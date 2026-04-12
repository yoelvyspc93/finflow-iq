create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create or replace function public.install_process_financial_ai_schedule()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  existing_job_id bigint;
  project_url text;
  publishable_key text;
  cron_secret text;
begin
  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name = 'project_url';

  select decrypted_secret
  into publishable_key
  from vault.decrypted_secrets
  where name = 'publishable_key';

  select decrypted_secret
  into cron_secret
  from vault.decrypted_secrets
  where name = 'process_financial_ai_cron_secret';

  if project_url is null or publishable_key is null or cron_secret is null then
    return;
  end if;

  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'process-financial-ai-every-minute';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'process-financial-ai-every-minute',
    '* * * * *',
    format(
      $cron$
        select
          net.http_post(
            url := %L || '/functions/v1/process-financial-ai',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || %L,
              'x-finflow-cron-secret', %L
            ),
            body := '{"batchSize":5}'::jsonb
          ) as request_id;
      $cron$,
      project_url,
      publishable_key,
      cron_secret
    )
  );
end;
$$;

do $$
begin
  perform public.install_process_financial_ai_schedule();
exception
  when undefined_table or undefined_function then
    null;
end;
$$;
