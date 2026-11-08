// Mascota "Orqui", una llamita peruana original para las pantallas de acceso.
// Sigue con la mirada lo que escribes, se tapa los ojos con la contraseña,
// espía si la muestras, se entristece si hay error y sonríe al entrar.
(() => {
    const SVG = `
<svg class="mascot" viewBox="18 -4 164 164" role="img" aria-label="Orqui, la llamita de Orquídea Tour Perú">
  <g class="head-group">
    <!-- orejas con borlas peruanas -->
    <g>
      <ellipse cx="62" cy="40" rx="13" ry="30" fill="#f3e3c3" transform="rotate(-18 62 40)"/>
      <ellipse cx="62" cy="44" rx="6" ry="20" fill="#f9a8d4" transform="rotate(-18 62 44)"/>
      <ellipse cx="138" cy="40" rx="13" ry="30" fill="#f3e3c3" transform="rotate(18 138 40)"/>
      <ellipse cx="138" cy="44" rx="6" ry="20" fill="#f9a8d4" transform="rotate(18 138 44)"/>
      <g class="tassel"><line x1="52" y1="18" x2="48" y2="6" stroke="#dc2626" stroke-width="3"/><circle cx="47" cy="5" r="6" fill="#ef4444"/><circle cx="54" cy="9" r="4" fill="#f59e0b"/></g>
      <g class="tassel t2"><line x1="148" y1="18" x2="152" y2="6" stroke="#7c3aed" stroke-width="3"/><circle cx="153" cy="5" r="6" fill="#8b5cf6"/><circle cx="146" cy="9" r="4" fill="#10b981"/></g>
    </g>
    <!-- cuello y cabeza -->
    <rect x="66" y="130" width="68" height="80" rx="30" fill="#f3e3c3"/>
    <ellipse cx="100" cy="98" rx="56" ry="54" fill="#f7ead0"/>
    <!-- lana del copete -->
    <g fill="#fffaf0">
      <circle cx="78" cy="52" r="13"/><circle cx="95" cy="45" r="15"/><circle cx="113" cy="47" r="14"/><circle cx="126" cy="56" r="11"/><circle cx="86" cy="60" r="10"/><circle cx="108" cy="58" r="11"/>
    </g>
    <!-- mejillas -->
    <ellipse cx="66" cy="112" rx="10" ry="6" fill="#fda4af" opacity="0.7"/>
    <ellipse cx="134" cy="112" rx="10" ry="6" fill="#fda4af" opacity="0.7"/>
    <!-- ojos -->
    <g class="eyes-open">
      <g class="blink">
        <ellipse cx="80" cy="88" rx="11" ry="13" fill="#fff"/>
        <ellipse cx="120" cy="88" rx="11" ry="13" fill="#fff"/>
        <g class="pupils">
          <circle cx="80" cy="90" r="6.5" fill="#1e293b"/><circle cx="82.5" cy="87.5" r="2" fill="#fff"/>
          <circle cx="120" cy="90" r="6.5" fill="#1e293b"/><circle cx="122.5" cy="87.5" r="2" fill="#fff"/>
        </g>
      </g>
      <path class="tear" d="M70 102 q-3 6 0 8 q3 -2 0 -8z" fill="#38bdf8"/>
    </g>
    <g class="eyes-happy" stroke="#1e293b" stroke-width="4" stroke-linecap="round" fill="none">
      <path d="M70 90 q10 -12 20 0"/><path d="M110 90 q10 -12 20 0"/>
    </g>
    <!-- hocico -->
    <ellipse cx="100" cy="122" rx="26" ry="19" fill="#fffaf0"/>
    <path d="M93 115 q7 6 14 0" stroke="#7c5a3a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <g class="mouth">
      <path class="mouth-normal" d="M100 120 v6 M92 128 q8 6 16 0" stroke="#7c5a3a" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path class="mouth-sad" d="M100 120 v6 M91 133 q9 -7 18 0" stroke="#7c5a3a" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path class="mouth-happy" d="M100 120 v4 M88 126 q12 14 24 0z" stroke="#7c5a3a" stroke-width="3" stroke-linejoin="round" fill="#fb7185"/>
    </g>
  </g>
  <!-- patitas que tapan los ojos -->
  <g class="arm arm-left">
    <path d="M40 200 C40 150 50 112 68 92 C76 84 92 86 94 96 C96 106 86 112 80 120 C70 136 66 170 66 200 Z" fill="#ead6ad" stroke="#d9c08f" stroke-width="2"/>
    <ellipse cx="81" cy="91" rx="18" ry="15" fill="#8b5e3c"/><ellipse cx="76" cy="86" rx="5" ry="3" fill="#a87a52"/>
  </g>
  <g class="arm arm-right">
    <path d="M160 200 C160 150 150 112 132 92 C124 84 108 86 106 96 C104 106 114 112 120 120 C130 136 134 170 134 200 Z" fill="#ead6ad" stroke="#d9c08f" stroke-width="2"/>
    <ellipse cx="119" cy="91" rx="18" ry="15" fill="#8b5e3c"/><ellipse cx="124" cy="86" rx="5" ry="3" fill="#a87a52"/>
  </g>
</svg>`;

    function mount(badge) {
        if (!badge) return null;
        badge.innerHTML = SVG;
        const svg = badge.querySelector('svg');
        const pupils = svg.querySelector('.pupils');
        let moodTimer = null;

        const api = {
            look(ratio = 0.5, down = true) {
                const x = Math.max(-1, Math.min(1, ratio * 2 - 1)) * 6;
                pupils.style.transform = `translate(${x}px, ${down ? 3 : 0}px)`;
            },
            center() { pupils.style.transform = 'translate(0, 0)'; },
            cover(on) { svg.classList.toggle('is-covering', on); if (!on) svg.classList.remove('is-peeking'); },
            peek(on) { svg.classList.toggle('is-peeking', on); },
            mood(name, ms = 2200) {
                clearTimeout(moodTimer);
                svg.classList.remove('is-sad', 'is-happy');
                if (!name) return;
                svg.classList.add(`is-${name}`);
                if (ms) moodTimer = setTimeout(() => svg.classList.remove(`is-${name}`), ms);
            }
        };

        // Campos de texto: la mirada sigue lo escrito
        document.querySelectorAll('[data-mascot-look]').forEach(input => {
            const follow = () => api.look(Math.min((input.selectionEnd ?? input.value.length) / 32, 1));
            ['focus', 'input', 'click', 'keyup'].forEach(type => input.addEventListener(type, follow));
            input.addEventListener('blur', () => api.center());
        });

        // Contraseñas: se tapa los ojos; espía si se muestra
        const passwords = [...document.querySelectorAll('[data-mascot-hide]')];
        const refreshCover = () => {
            const focused = passwords.some(input => input === document.activeElement);
            api.cover(focused);
            api.peek(focused && passwords.some(input => input.type === 'text'));
        };
        passwords.forEach(input => {
            input.addEventListener('focus', refreshCover);
            input.addEventListener('blur', () => setTimeout(refreshCover, 50));
        });
        document.querySelectorAll('[data-toggle-password]').forEach(button => {
            button.addEventListener('mousedown', event => event.preventDefault()); // conserva el foco
            button.addEventListener('click', () => {
                const input = document.getElementById(button.dataset.togglePassword);
                if (!input) return;
                const show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                button.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
                button.setAttribute('aria-pressed', String(show));
                button.innerHTML = `<i class="fa-solid fa-${show ? 'eye-slash' : 'eye'}" aria-hidden="true"></i>`;
                input.focus();
                refreshCover();
            });
        });

        document.addEventListener('auth:error', () => {
            api.cover(false);
            api.mood('sad', 2600);
            const card = badge.closest('.auth-card');
            if (card) {
                card.classList.remove('shake');
                void card.offsetWidth;
                card.classList.add('shake');
            }
        });
        document.addEventListener('auth:success', () => {
            api.cover(false);
            api.mood('happy', 0);
        });
        return api;
    }

    window.OrquiMascot = { mount };
    document.addEventListener('DOMContentLoaded', () => {
        window.orqui = mount(document.querySelector('[data-mascot]'));
    });
})();
