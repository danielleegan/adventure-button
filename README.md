# The Outernet Adventure Button

A web application that generates random adventures near you in San Francisco, California, using data from Supabase databases.

## Features

- 🗺️ Location detection or map-based selection
- 🎲 Random adventure selection from `events` and `places_sf` databases
- 🎨 Optional vibe filtering (caffeine fix, yummy snack, fun activity)
- 🧭 Google Maps navigation integration
- 🎁 Surprise reveal functionality

## Setup

### Prerequisites

- A Supabase account with two tables: `events` and `places_sf`
- A Mapbox access token (already configured in `config.js`)
- A web server (can use a simple local server like Python's `http.server` or Node's `http-server`)

### Configuration

1. **Supabase Configuration**

   Edit `config.js` and replace the placeholder values:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```

   You can find these values in your Supabase project settings under API.
   
   **Security Note**: These are public keys designed for client-side use. Make sure to enable Row Level Security (RLS) policies in Supabase to protect your data. See `SECURITY.md` for details.

2. **Mapbox Token**

   The Mapbox token is already configured in `config.js`. If you need to change it, update the `MAPBOX_TOKEN` constant.

   **Security Note**: This is a public token (starts with `pk.`). Configure URL restrictions in your Mapbox Dashboard to limit where it can be used. See `SECURITY.md` for details.

   Note: The app uses Google Maps for navigation links (when you click "google maps navigation →"), but Mapbox for the interactive map display.

### Database Schema

Your Supabase tables should include the following fields (at minimum):

**events table:**
- `id` (primary key)
- `name` or `title` (string)
- `description` (string, optional)
- `address` or `location` (string, optional)
- `latitude` (number, optional)
- `longitude` (number, optional)
- `category` (string, optional) - for vibe filtering

**places_sf table:**
- `id` (primary key)
- `name` or `title` (string)
- `description` (string, optional)
- `address` or `location` (string, optional)
- `latitude` (number, optional)
- `longitude` (number, optional)
- `category` (string, optional) - for vibe filtering

### Running the Application

1. Start a local web server. For example, using Python:
   ```bash
   python3 -m http.server 8000
   ```

   Or using Node.js (if you have http-server installed):
   ```bash
   npx http-server -p 8000
   ```

2. Open your browser and navigate to `http://localhost:8000`

## Usage

1. Click "locate me" to use your current location, or click on the map to select a location in San Francisco
2. Optionally select a vibe (caffeine fix, yummy snack, or fun activity)
3. Click "create adventure!" to get a random adventure
4. Use the Google Maps link to navigate to your adventure
5. Click "tap to reveal your adventure" to see the details (or keep it a surprise!)

## Notes

- The application is currently limited to San Francisco, California
- Location bounds checking ensures adventures are within SF city limits
- Vibe filtering uses category and keyword matching - you may need to adjust the `filterByVibe` function in `app.js` based on your database schema

