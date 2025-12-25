
// Initialize Supabase Client
// REPLACE THESE WITH YOUR ACTUAL SUPABASE URL AND ANON KEY
window.SUPABASE_URL = window.SUPABASE_URL || 'https://qkrgogzlqynebqzijtew.supabase.co';
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcmdvZ3pscXluZWJxemlqdGV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDU1NzUsImV4cCI6MjA4MDc4MTU3NX0.klmTg6bYtLFHxh3XGnpwUVBDEVtvaDWuv3ypV1zwcK8';

if (window.SUPABASE_URL === 'YOUR_SUPABASE_URL' || window.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.error('Please update assets/js/supabase-client.js with your Supabase credentials.');
    alert('System Error: Supabase credentials not configured.');
}

// Wait for Supabase to load, then create client
window.supabaseClient = window.supabaseClient || null;

if (typeof window !== 'undefined' && window.supabase) {
    window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    console.log('Supabase client initialized successfully');
} else {
    // Fallback for when script loads after this
    window.addEventListener('load', () => {
        if (window.supabase && !window.supabaseClient) {
            window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
            console.log('Supabase client initialized successfully');
        }
    });
}
