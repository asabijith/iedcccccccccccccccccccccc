
// Initialize Supabase Client (uses SDK when available, REST fallback otherwise)
// REPLACE THESE WITH YOUR ACTUAL SUPABASE URL AND ANON KEY
window.SUPABASE_URL = window.SUPABASE_URL || 'https://qkrgogzlqynebqzijtew.supabase.co';
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcmdvZ3pscXluZWJxemlqdGV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDU1NzUsImV4cCI6MjA4MDc4MTU3NX0.klmTg6bYtLFHxh3XGnpwUVBDEVtvaDWuv3ypV1zwcK8';

if (window.SUPABASE_URL === 'YOUR_SUPABASE_URL' || window.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.error('Please update assets/js/supabase-client.js with your Supabase credentials.');
    alert('System Error: Supabase credentials not configured.');
}

// Lightweight REST fallback for environments where the CDN is blocked
function createRestClient(url, key) {
    const restUrl = `${url}/rest/v1`;
    const baseHeaders = {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
    };

    const handleResponse = async (response, expectSingle = false) => {
        const text = await response.text();
        const json = text ? JSON.parse(text) : null;

        if (!response.ok) {
            const message = json?.message || json?.error || response.statusText;
            return { data: null, error: message };
        }

        if (expectSingle && Array.isArray(json)) {
            return { data: json[0] || null, error: null };
        }

        return { data: json, error: null };
    };

    const client = {
        from(table) {
            const tableUrl = `${restUrl}/${table}`;

            return {
                select(columns = '*') {
                    const params = new URLSearchParams({ select: columns });

                    const buildUrl = () => `${tableUrl}?${params.toString()}`;

                    const api = {
                        eq(column, value) {
                            params.set(column, `eq.${value}`);
                            return api;
                        },
                        order(column, options = { ascending: true }) {
                            const direction = options.ascending === false ? 'desc' : 'asc';
                            params.set('order', `${column}.${direction}`);
                            return api;
                        },
                        async single() {
                            const res = await fetch(buildUrl(), { headers: baseHeaders });
                            return handleResponse(res, true);
                        },
                        async maybeSingle() {
                            const res = await fetch(buildUrl(), { headers: baseHeaders });
                            const result = await handleResponse(res);
                            if (Array.isArray(result.data)) {
                                return { data: result.data[0] || null, error: result.error || null };
                            }
                            return result;
                        }
                    };

                    return api;
                },

                update(payload) {
                    return {
                        async eq(column, value) {
                            const params = new URLSearchParams();
                            params.set(column, `eq.${value}`);
                            const res = await fetch(`${tableUrl}?${params.toString()}`, {
                                method: 'PATCH',
                                headers: {
                                    ...baseHeaders,
                                    Prefer: 'return=representation'
                                },
                                body: JSON.stringify(payload)
                            });
                            return handleResponse(res);
                        }
                    };
                }
            };
        }
    };

    client.__isRest = true; // marker so we can swap to SDK later
    return client;
}

// Initialize client using SDK if available, otherwise use REST fallback
window.supabaseClient = window.supabaseClient || null;
window.supabaseClientIsRest = false;

function initSupabaseClient() {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        window.supabaseClientIsRest = false;
        window.supabaseLoaded = true;
        console.log('Supabase client initialized (SDK)');
        return;
    }

    // REST fallback
    window.supabaseClient = createRestClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    window.supabaseClientIsRest = true;
    window.supabaseLoaded = true;
    console.log('Supabase client initialized (REST fallback)');
}

if (typeof window !== 'undefined') {
    initSupabaseClient();
    window.addEventListener('load', () => {
        // If SDK loads later and we are currently using REST, re-init with SDK
        if (window.supabase && typeof window.supabase.createClient === 'function' && window.supabaseClientIsRest) {
            initSupabaseClient();
        }
    });
}
