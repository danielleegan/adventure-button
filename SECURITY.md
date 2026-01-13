# Security Notes

## Public Keys vs Secret Keys

The tokens and keys used in this application are **public keys** designed to be used in client-side code. They are safe to include in your frontend code, but you should configure proper restrictions.

### Mapbox Token (`pk.eyJ1...`)
- ✅ **This is a PUBLIC token** (starts with `pk.`)
- ✅ Safe to use in client-side JavaScript
- 🔒 **Important**: Configure URL restrictions in Mapbox Dashboard:
  1. Go to your Mapbox account → Tokens
  2. Click on your token
  3. Under "URL restrictions", add your domain (e.g., `localhost:8000`, `yourdomain.com`)
  4. This prevents others from using your token on their sites

### Supabase Keys
- ✅ **SUPABASE_ANON_KEY** is a public/anonymous key
- ✅ **SUPABASE_URL** is your public API URL
- ✅ Both are safe to use in client-side code
- 🔒 **Important**: Enable Row Level Security (RLS) policies in Supabase:
  1. Go to your Supabase Dashboard → Authentication → Policies
  2. Enable RLS on your `events` and `places_sf` tables
  3. Create policies that control who can read/write data
  4. Even if someone gets your anon key, they can only access data your RLS policies allow

### What NOT to Do
- ❌ **Never** use Supabase **service_role** key in frontend code (starts with `eyJhbG...`)
- ❌ **Never** use Mapbox **secret token** in frontend code (starts with `sk.`)
- ❌ **Never** commit secret keys to version control

### Best Practices
1. Use public/anon keys for frontend code (what we're doing)
2. Configure restrictions (URL restrictions for Mapbox, RLS for Supabase)
3. Use environment variables for different environments (dev/staging/prod)
4. Monitor usage in both Mapbox and Supabase dashboards
5. Rotate keys if they're compromised

### For Production
Consider using environment variables and a build process, but note: **even with environment variables, these values will still be visible in the browser** because this is client-side JavaScript. The security comes from restrictions and policies, not from hiding the keys.

