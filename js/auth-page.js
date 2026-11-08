// Comportamiento de las pantallas de acceso: vistas, fuerza de contraseña.
(() => {
    const message = document.getElementById('auth-message');

    function showView(name) {
        const views = document.querySelectorAll('[data-view]');
        if (!views.length) return;
        views.forEach(view => view.classList.toggle('hidden', view.dataset.view !== name));
        const active = document.querySelector(`[data-view="${name}"]`);
        const submit = active?.querySelector('form [type="submit"]');
        if (message && submit) {
            message.classList.add('hidden');
            submit.before(message); // el aviso aparece en la vista activa
        }
        active?.querySelector('input')?.focus();
    }

    document.querySelectorAll('[data-show-view]').forEach(button => {
        button.addEventListener('click', () => {
            const email = document.getElementById('login-email')?.value;
            showView(button.dataset.showView);
            const forgot = document.getElementById('forgot-email');
            if (forgot && email && !forgot.value) forgot.value = email;
        });
    });

    window.addEventListener('auth:recovery', () => showView('recovery'));
    if (/type=recovery/.test(window.location.hash)) showView('recovery');

    function scorePassword(value) {
        let score = 0;
        if (value.length >= 10) score += 1;
        if (value.length >= 14) score += 1;
        if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
        if (/\d/.test(value)) score += 1;
        if (/[^A-Za-z0-9]/.test(value)) score += 1;
        return score;
    }

    document.querySelectorAll('[data-strength]').forEach(input => {
        const bar = document.getElementById(input.dataset.strength);
        const label = document.getElementById(`${input.dataset.strength}-label`);
        input.addEventListener('input', () => {
            const score = scorePassword(input.value);
            const levels = [['0%', '#e2e8f0', ''], ['20%', '#ef4444', 'Muy débil'], ['40%', '#f97316', 'Débil'], ['60%', '#eab308', 'Aceptable'], ['80%', '#22c55e', 'Fuerte'], ['100%', '#15803d', 'Muy fuerte']];
            const [width, color, text] = levels[input.value ? Math.max(1, score) : 0];
            if (bar) {
                bar.style.width = width;
                bar.style.background = color;
            }
            if (label) label.textContent = text;
        });
    });

    document.querySelectorAll('[data-match]').forEach(input => {
        const other = document.getElementById(input.dataset.match);
        const check = () => {
            const ok = !input.value || input.value === other?.value;
            input.setCustomValidity(ok ? '' : 'Las contraseñas no coinciden.');
            input.classList.toggle('!border-rose-400', !ok);
        };
        input.addEventListener('input', check);
        other?.addEventListener('input', check);
    });
})();
