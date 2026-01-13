# Rewrite Place Descriptions Script

This script processes all places in the `places_sf` table, combines their `description` and `detailed_description` columns, sends them to OpenAI to rewrite in a specific tone, and saves the result to the `our_description` column.

## Setup

1. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

2. **Get your API Keys and create `.env.local` file**:

   **Part A: Get your Supabase Service Role Key**
   
   The script needs the **service_role** key (not the anon key) because it needs to update the database. Here's how to get it:
   
   1. Go to https://supabase.com/dashboard (log in if needed)
   2. Select your project (the one with URL `xufbrplzdcrtyzpmepzv.supabase.co`)
   3. In the left sidebar, click on **Settings** (gear icon at the bottom)
   4. Click on **API** in the settings menu
   5. Scroll down to find the **Project API keys** section
   6. Look for the **`service_role`** key (⚠️ This is a SECRET key - it starts with `eyJhbG...`)
   7. Click the "Reveal" or "Copy" button next to it to copy the full key
   
   **⚠️ Important Security Note**: The `service_role` key has full database access and bypasses Row Level Security. Never commit it to version control or share it publicly!
   
   **Part B: Get your OpenAI API Key**
   
   1. Go to https://platform.openai.com/api-keys
   2. Log in to your OpenAI account (or create one if you don't have it)
   3. Click the **"Create new secret key"** button
   4. Give it a name (e.g., "adventure-button-descriptions")
   5. Click **"Create secret key"**
   6. **IMPORTANT**: Copy the key immediately - you won't be able to see it again!
   7. Save it somewhere safe temporarily (you'll paste it into the file next)
   
   **Part C: Create the `.env.local` file**
   
   1. In your project root directory (`/Users/danielleegan/adventure-button/`), create a new file named `.env.local`
      - You can do this in your code editor, or from the terminal: `touch .env.local`
   2. Open the `.env.local` file and paste this content:
   
   ```bash
   SUPABASE_URL=https://xufbrplzdcrtyzpmepzv.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=paste_your_service_role_key_here
   OPENAI_API_KEY=paste_your_openai_api_key_here
   ```
   
   3. Replace `paste_your_service_role_key_here` with the Supabase service_role key you copied
   4. Replace `paste_your_openai_api_key_here` with the OpenAI API key you copied
   
   **Example of what it should look like:**
   ```bash
   SUPABASE_URL=https://xufbrplzdcrtyzpmepzv.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1ZmJycGx6ZGNydHl6cG1lcHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTYzNDU2Nzg5MCwiZXhwIjoxOTUwMTQzODkwfQ.example_key_here
   OPENAI_API_KEY=sk-proj-example_key_here
   
   # Optional: Customize the rewrite tone (uncomment to use)
   # REWRITE_TONE=friendly, adventurous, and concise. Write in a playful, inviting tone that makes people excited to visit. Keep it under 150 words.
   ```
   
   **Important Notes:**
   - Make sure there are **no quotes** around the keys (just paste them directly)
   - Make sure there are **no spaces** before or after the `=` sign
   - The `.env.local` file should be in the same directory as `rewrite-descriptions.js`
   - The `.gitignore` file already includes `.env.local`, so it won't be committed to git

## Usage

**Test Mode (Recommended first):** Run on just the first 5 places to test:
```bash
node rewrite-descriptions.js --test
```

**Full Run:** Process all places:
```bash
node rewrite-descriptions.js
```

The script will:
- Fetch all places that have either `description` or `detailed_description`
- In test mode (`--test`), only process the first 5 places
- Skip places that already have `our_description` (to avoid re-processing)
- Process 5 places concurrently (to avoid OpenAI rate limits)
- Update each place's `our_description` column with the rewritten text
- Show progress and a summary at the end

**💡 Tip:** Always run with `--test` first to verify everything works correctly before processing all places!

## Customizing the Tone

You can customize the rewrite tone by setting the `REWRITE_TONE` environment variable in `.env.local`, or by editing the default value in `rewrite-descriptions.js`:

```javascript
const REWRITE_TONE = process.env.REWRITE_TONE || `your custom tone here`;
```

Examples:
- `"friendly, adventurous, and concise. Write in a playful, inviting tone that makes people excited to visit. Keep it under 150 words."`
- `"professional and informative, highlighting key features and amenities."`
- `"casual and conversational, like a friend recommending a great spot."`

## Re-processing Places

By default, the script skips places that already have an `our_description`. To re-process all places, you can:

1. Manually clear the `our_description` column in Supabase, or
2. Modify the script to remove the skip check (look for the `if (our_description)` condition)

## Error Handling

The script will:
- Continue processing even if individual places fail
- Show a summary of successes, skips, and errors at the end
- Log detailed error messages for debugging

## Cost Considerations

- Uses `gpt-4o-mini` by default (cost-effective)
- Processes 5 places concurrently to balance speed and rate limits
- Each place uses ~300 max tokens

To use a different model, edit the `model` parameter in the `rewriteDescription` function.

