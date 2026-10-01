(() => {
    const supabaseUrl = 'https://rncdodmxldwcbtcrqdph.supabase.co';
    const supabasePublishableKey = 'sb_publishable_tM1YnpuzvteyuLzp7ZDEww_sO8FqpAU';

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
