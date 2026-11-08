(() => {
    const client = window.supabaseClient;
    const inHtmlFolder = window.location.pathname.toLowerCase().includes('/html/');

    function showAuthMessage(message, isError = false) {
        const target = document.getElementById('auth-message');
        if (!target) return;
        target.textContent = message;
        target.className = `rounded-xl px-3.5 py-2.5 text-sm font-medium ${isError ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-brand-50 text-brand-800 border border-brand-200'}`;
        target.classList.remove('hidden');
        document.dispatchEvent(new CustomEvent(isError ? 'auth:error' : 'auth:info'));
    }

    async function redirectForUser(user) {
        const { data, error } = await client.from('user_roles').select('role').eq('user_id', user.id);
        if (error) {
            showAuthMessage('No pudimos verificar tu tipo de cuenta. Revisa que hayas ejecutado database/schema.sql en Supabase.', true);
            return;
        }
        document.dispatchEvent(new CustomEvent('auth:success'));
        const roles = (data || []).map(record => record.role);
        const staffRoles = ['admin', 'cajero', 'agente', 'rrhh', 'atencion'];
        const destination = roles.some(role => staffRoles.includes(role)) ? 'admin.html' : 'admin_cliente.html';
        setTimeout(() => window.location.replace(inHtmlFolder ? destination : `html/${destination}`), 700);
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
        if (password.length < 10) {
            showAuthMessage('La contraseña debe tener al menos 10 caracteres.', true);
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

    async function requestPasswordReset(form) {
        const button = form.querySelector('[type="submit"]');
        const email = form.elements.email.value.trim().toLowerCase();
        if (!email) return;
        button.disabled = true;
        const redirectTo = new URL('login.html', window.location.href).href;
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
        button.disabled = false;
        // Mismo mensaje exista o no la cuenta (no revela qué correos están registrados).
        if (error && /rate limit/i.test(error.message)) {
            showAuthMessage('Ya enviamos un correo hace poco. Espera unos minutos e inténtalo otra vez.', true);
            return;
        }
        showAuthMessage('Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.');
    }

    async function saveNewPassword(form) {
        const password = form.elements.newPassword.value;
        if (password.length < 10) {
            showAuthMessage('La contraseña debe tener al menos 10 caracteres.', true);
            return;
        }
        if (password !== form.elements.confirmNewPassword.value) {
            showAuthMessage('Las contraseñas no coinciden.', true);
            return;
        }
        const button = form.querySelector('[type="submit"]');
        button.disabled = true;
        const { data, error } = await client.auth.updateUser({ password });
        if (error) {
            showAuthMessage(error.message || 'No se pudo cambiar la contraseña. Pide un nuevo enlace.', true);
            button.disabled = false;
            return;
        }
        showAuthMessage('¡Listo! Tu contraseña fue actualizada.');
        await redirectForUser(data.user);
    }

    client.auth.onAuthStateChange(event => {
        if (event === 'PASSWORD_RECOVERY') window.dispatchEvent(new CustomEvent('auth:recovery'));
    });

    async function signOutSupabase() {
        const { error } = await client.auth.signOut();
        if (error) showAuthMessage(error.message, true);
        else window.location.replace(inHtmlFolder ? '../index.html' : 'index.html');
    }

    window.submitLogin = submitLogin;
    window.submitRegistration = submitRegistration;
    window.requestPasswordReset = requestPasswordReset;
    window.saveNewPassword = saveNewPassword;
    window.redirectForSupabaseUser = redirectForUser;
    window.signOutSupabase = signOutSupabase;
})();
