# Keen by Alacrity

Points, attendance and Electricity Bucks for Alacrity Designs students.

## Deploy

1. Push this repo to GitHub.
2. Import it into Vercel.
3. Add two environment variables in Vercel (Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL` = https://dmpqnqfsskbaocolhqzl.supabase.co
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon/publishable key from Supabase → Project Settings → API
4. Deploy, then copy the live URL.
5. In Supabase → Authentication → URL Configuration, set **Site URL** to that Vercel URL
   and add it under **Redirect URLs**. Sign-in links will not work until you do this.

## Roles

- The first sign-in from `harissehgal01@gmail.com` becomes admin automatically.
- Everyone else lands as `pending` and sees nothing until approved on the People tab.
- Approved parents and students can read only the student they're linked to.
  This is enforced by row-level security in Postgres, not by the interface.

alacritydesigns.com · connect@alacritydesigns.com
