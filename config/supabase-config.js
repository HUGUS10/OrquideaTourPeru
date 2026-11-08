(() => {
    const supabaseUrl = 'https://vghjkfusauakqzkzsqes.supabase.co';
    const supabasePublishableKey = 'sb_publishable_iXSx2FFe9_U0UhiZ7pGf3w_k6NdGJ5E';

    if (!window.supabase?.createClient) {
        throw new Error('No se pudo cargar el cliente de Supabase.');
    }

    window.supabaseClient = window.supabase.createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    });
})();
