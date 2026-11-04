# Supabase login setup

The login screen verifies the shared password in the `login-gate` Edge Function. The password is not part of the frontend environment or production bundle. After verification, the function creates a Supabase Auth session with a server-only workspace claim. The workspace tables' RLS policies require this claim, so ordinary public Auth accounts do not gain access.

## Deploy

From the project directory, link the Supabase CLI to the existing project, then run:

```powershell
supabase link --project-ref <your-project-ref>
supabase secrets set LOGIN_PASSWORD='<the shared password>'
supabase db push
supabase functions deploy login-gate
```

Set the password only as a Supabase function secret. Do not put it in `VITE_*` variables, source files, or a checked-in `.env` file. The function uses Supabase's server-provided URL, anon key, and service-role key; none of those server credentials are added to the frontend.

The first successful login provisions a dedicated workspace Auth user. Any non-empty username is accepted as its display name; access is controlled by the shared password. The function limits each observed client IP to four failed attempts per 15-minute window.

## Local frontend

Keep the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values in your ignored local `.env` file. The deployed Edge Function and database migration must be available to sign in. The **Remember me** checkbox controls whether the Supabase session is stored for the browser session or persisted across browser restarts.

To rotate the shared password, update the `LOGIN_PASSWORD` Supabase secret. The internal Auth account password is derived from the project service-role key, so rotating the shared password does not require changing frontend configuration.
