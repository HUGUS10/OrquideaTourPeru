(() => {
    const client = window.supabaseClient;
    const inHtmlFolder = window.location.pathname.toLowerCase().includes('/html/');

    function showAuthMessage(message, isError = false) {
        const target = document.getElementById('auth-message');
        if (!target) return;
        target.textContent = message;
        target.className = `mt-4 rounded-lg px-3 py-2 text-sm ${isError ? 'bg-rose-50 text-rose-700' : 'bg-brand-50 text-brand-800'}`;
        target.classList.remove('hidden');
    }

    async function redirectForUser(user) {
        const { data, error } = await client.from('user_roles').select('role').eq('user_id', user.id);
        if (error) {
            showAuthMessage('No pudimos verificar tu tipo de cuenta. Revisa que hayas ejecutado database/schema.sql en Supabase.', true);
            return;
        }
        const roles = (data || []).map(record => record.role);
        const destination = roles.includes('admin') ? 'admin.html' : 'admin_cliente.html';
        window.location.replace(inHtmlFolder ? destination : `html/${destination}`);
    }

    async function submitLogin(form) {
        const button = form.querySelector('[type="submit"]');
        button.disabled = true;
        button.textContent = 'Ingresando...';
        const { data, error } = await client.auth.signInWithPassword({
            email: form.elements.email.value.trim().toLowerCase(),
            password: form.elements.password.value
        });
        if (error) {
            showAuthMessage('Correo o contraseña incorrectos. Verifica tus datos e intenta otra vez.', true);
            button.disabled = false;
            button.textContent = 'Iniciar sesión';
            return;
        }
        await redirectForUser(data.user);
    }

    async function submitRegistration(form) {
        const password = form.elements.password.value;
        const confirmation = form.elements.confirmPassword.value;
        if (password.length < 8) {
            showAuthMessage('La contraseña debe tener al menos 8 caracteres.', true);
            return;
        }
        if (password !== confirmation) {
            showAuthMessage('Las contraseñas no coinciden.', true);
            return;
        }
        const button = form.querySelector('[type="submit"]');
        button.disabled = true;
        button.textContent = 'Creando cuenta...';
        const firstName = form.elements.firstName.value.trim();
        const lastName = form.elements.lastName.value.trim();
        const { data, error } = await client.auth.signUp({
            email: form.elements.email.value.trim().toLowerCase(),
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    full_name: `${firstName} ${lastName}`,
                    document_number: form.elements.document.value.trim(),
                    phone: form.elements.phone.value.trim()
                }
            }
        });
        if (error) {
            showAuthMessage(error.message || 'No se pudo crear la cuenta.', true);
            button.disabled = false;
            button.textContent = 'Crear cuenta';
            return;
        }
        if (data.session) {
            await redirectForUser(data.user);
            return;
        }
        showAuthMessage('Cuenta creada. Revisa tu correo para confirmar la dirección y luego inicia sesión.');
        button.disabled = false;
        button.textContent = 'Crear cuenta';
    }

    async function signOutSupabase() {
        const { error } = await client.auth.signOut();
        if (error) showAuthMessage(error.message, true);
        else window.location.replace(inHtmlFolder ? '../index.html' : 'index.html');
    }

    window.submitLogin = submitLogin;
    window.submitRegistration = submitRegistration;
    window.redirectForSupabaseUser = redirectForUser;
    window.signOutSupabase = signOutSupabase;
})();
