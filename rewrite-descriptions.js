/**
 * Script to rewrite place descriptions using OpenAI
 * 
 * This script:
 * 1. Fetches all places from places_sf with description and detailed_description
 * 2. Sends them to OpenAI to rewrite in a specific tone
 * 3. Updates the our_description column in places_sf
 * 
 * Usage:
 *   node rewrite-descriptions.js
 * 
 * Environment variables needed:
 *   - SUPABASE_URL (or use the one from config.js)
 *   - SUPABASE_SERVICE_ROLE_KEY (for updating records - get from Supabase dashboard)
 *   - OPENAI_API_KEY (your OpenAI API key)
 */

// Try to load environment variables from .env.local (optional)
try {
    require('dotenv').config({ path: '.env.local' });
} catch (e) {
    // dotenv not installed or .env.local not found - will use process.env directly
}

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const pLimit = require('p-limit').default;

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xufbrplzdcrtyzpmepzv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Tone/style for rewriting (customize this)
const REWRITE_TONE = process.env.REWRITE_TONE || `adventurous, irreverent, witty without trying. never cringe. do not say anything cringey or cliche, don’t say “chill” or make millennial jokes. don’t exaggerate, like “change your life.” emphasize what is unique. think: “your cool friend who knows the city and has impeccable taste.” no emojis. no semicolons or em dashses. keep it under 12 words and 1 sentence. make sure it is gramatically correct. don't use synonyms unnecessarily.`;

// Rate limiting: process 5 places concurrently to avoid OpenAI rate limits
const CONCURRENT_LIMIT = 5;

// Test mode: process only first 5 rows (set to true for testing, or use --test flag)
const TEST_MODE = process.argv.includes('--test') || process.env.TEST_MODE === 'true';
const TEST_LIMIT = 5;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    console.error('Get it from: Supabase Dashboard > Settings > API > service_role key');
    process.exit(1);
}

if (!OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    console.error('Get it from: https://platform.openai.com/api-keys');
    process.exit(1);
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const limit = pLimit(CONCURRENT_LIMIT);

/**
 * Rewrite description using OpenAI
 */
async function rewriteDescription(description, detailedDescription) {
    // Combine descriptions
    const combinedText = [
        description || '',
        detailedDescription || ''
    ].filter(Boolean).join('\n\n');

    if (!combinedText.trim()) {
        return null; // No description to rewrite
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini', // Using mini for cost efficiency, can change to gpt-4o if needed
            messages: [
                {
                    role: 'system',
                    content: `You are a creative copywriter. Rewrite the following place description in a ${REWRITE_TONE}`
                },
                {
                    role: 'user',
                    content: `Original description:\n\n${combinedText}\n\nPlease rewrite this description:`
                }
            ],
            temperature: 0.7,
            max_tokens: 300
        });

        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('OpenAI API error:', error.message);
        throw error;
    }
}

/**
 * Process a single place
 */
async function processPlace(place) {
    const { place_id, name, description, detailed_description, our_description } = place;

    // Skip if already has our_description (but allow re-processing in test mode)
    if (our_description && !TEST_MODE) {
        console.log(`⏭️  Skipping ${name} (place_id: ${place_id}) - already has our_description`);
        return { place_id, name, skipped: true };
    }
    
    // In test mode, indicate we're re-processing
    if (our_description && TEST_MODE) {
        console.log(`🔄 Re-processing ${name} (place_id: ${place_id}) - regenerating our_description`);
    }

    // Skip if no descriptions to work with
    if (!description && !detailed_description) {
        console.log(`⏭️  Skipping ${name} (place_id: ${place_id}) - no description or detailed_description`);
        return { place_id, name, skipped: true, reason: 'no description' };
    }

    try {
        console.log(`🔄 Processing ${name} (place_id: ${place_id})...`);
        
        // Output original descriptions
        console.log('\n📝 Original descriptions:');
        if (description) console.log(`   Description: ${description}`);
        if (detailed_description) console.log(`   Detailed: ${detailed_description}`);
        
        const rewritten = await rewriteDescription(description, detailed_description);

        if (!rewritten) {
            console.log(`⚠️  No rewritten description for ${name} (place_id: ${place_id})`);
            return { place_id, name, skipped: true, reason: 'no rewritten text' };
        }

        // Output rewritten description
        console.log(`\n✨ Rewritten description:\n   ${rewritten}\n`);

        // Update the place in Supabase
        const { error } = await supabase
            .from('places_sf')
            .update({ our_description: rewritten })
            .eq('place_id', place_id);

        if (error) {
            console.error(`❌ Error updating ${name} (place_id: ${place_id}):`, error.message);
            return { place_id, name, error: error.message };
        }

        console.log(`✅ Updated ${name} (place_id: ${place_id})`);
        return { place_id, name, success: true };
    } catch (error) {
        console.error(`❌ Error processing ${name} (place_id: ${place_id}):`, error.message);
        return { place_id, name, error: error.message };
    }
}

/**
 * Main function
 */
async function main() {
    if (TEST_MODE) {
        console.log('🧪 TEST MODE: Processing only first 5 places\n');
    }
    console.log('🚀 Starting description rewrite process...\n');
    console.log('📝 Rewrite tone:', REWRITE_TONE);
    console.log('');

    try {
        // Fetch all places with description or detailed_description
        console.log('📥 Fetching places from places_sf...');
        
        let places = [];
        const PAGE_SIZE = 1000; // Supabase default limit
        let from = 0;
        let to = PAGE_SIZE - 1;
        let hasMore = true;

        // In test mode, just get 5 new places
        if (TEST_MODE) {
            const { data, error: fetchError } = await supabase
                .from('places_sf')
                .select('place_id, name, description, detailed_description, our_description')
                .or('description.not.is.null,detailed_description.not.is.null')
                .is('our_description', null)
                .limit(TEST_LIMIT);
            
            if (fetchError) {
                console.error('❌ Error fetching places:', fetchError);
                process.exit(1);
            }
            places = data || [];
        } else {
            // Paginate to get all places (Supabase has a 1000 row limit per query)
            while (hasMore) {
                let query = supabase
                    .from('places_sf')
                    .select('place_id, name, description, detailed_description, our_description')
                    .or('description.not.is.null,detailed_description.not.is.null')
                    .range(from, to);
                
                const { data, error: fetchError } = await query;
                
                if (fetchError) {
                    console.error('❌ Error fetching places:', fetchError);
                    process.exit(1);
                }
                
                if (data && data.length > 0) {
                    places = places.concat(data);
                    console.log(`   Fetched ${places.length} places so far...`);
                    
                    // If we got fewer than PAGE_SIZE, we've reached the end
                    if (data.length < PAGE_SIZE) {
                        hasMore = false;
                    } else {
                        from = to + 1;
                        to = from + PAGE_SIZE - 1;
                    }
                } else {
                    hasMore = false;
                }
            }
        }

        const totalMsg = TEST_MODE 
            ? `📊 Found ${places.length} new places to process (TEST MODE - limited to ${TEST_LIMIT} without our_description)\n`
            : `📊 Found ${places.length} places to process\n`;
        console.log(totalMsg);

        if (places.length === 0) {
            console.log('No places to process. Exiting.');
            return;
        }

        // Process places with concurrency limit
        const results = await Promise.all(
            places.map(place => limit(() => processPlace(place)))
        );

        // Summary
        const successful = results.filter(r => r.success).length;
        const skipped = results.filter(r => r.skipped).length;
        const errors = results.filter(r => r.error).length;

        console.log('\n' + '='.repeat(50));
        if (TEST_MODE) {
            console.log('🧪 TEST MODE SUMMARY');
            console.log('='.repeat(50));
        }
        console.log('📊 Summary:');
        console.log(`   ✅ Successfully updated: ${successful}`);
        console.log(`   ⏭️  Skipped: ${skipped}`);
        console.log(`   ❌ Errors: ${errors}`);
        console.log(`   📝 Total processed: ${results.length}`);
        if (TEST_MODE) {
            console.log('\n💡 To process all places, run without --test flag');
        }
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run the script
main();

