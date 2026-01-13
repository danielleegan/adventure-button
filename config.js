// Supabase configuration
// Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://xufbrplzdcrtyzpmepzv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Hh6mcfSnO8D0MUTuegRKLg_vL34kKR9';

// Mapbox API Token
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYXRoZW5hbHloIiwiYSI6ImNtZjY0YTJtbTA4bnkya29tZzU3eWJscDkifQ.7jhpDuPJbkRe14kSycGBgg';

// Initialize Supabase client - Supabase CDN exposes createClient via window.supabase
// Use a different variable name to avoid conflicts
var supabaseClient;
if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error('Supabase library not loaded. Make sure the Supabase script is loaded before config.js');
}

