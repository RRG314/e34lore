alter table public.threads add constraint thread_observations_shape check(jsonb_typeof(observations)='array' and jsonb_array_length(observations)<=20 and octet_length(observations::text)<=16000);
