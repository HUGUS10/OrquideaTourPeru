// Mascota "Inti": el sol del logo de Orquídea Tour Perú, para las pantallas de acceso.
// Sigue con la mirada lo que escribes, se tapa los ojos con la contraseña,
// espía si la muestras, se entristece si hay error y sonríe al entrar.
(() => {
    const SVG = `
<svg class="mascot" viewBox="0 0 200 200" role="img" aria-label="Inti, el sol de Orquídea Tour Perú">
  <defs>
    <radialGradient id="inti-body" cx="42%" cy="36%" r="70%">
      <stop offset="0" stop-color="#fff3a3"/><stop offset="0.45" stop-color="#ffd23f"/><stop offset="1" stop-color="#f7941d"/>
    </radialGradient>
    <linearGradient id="inti-ray" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd23f"/><stop offset="1" stop-color="#f7941d"/>
    </linearGradient>
    <linearGradient id="inti-hill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#c5e063"/><stop offset="1" stop-color="#7cb342"/>
    </linearGradient>
    <linearGradient id="inti-hand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffcf3a"/><stop offset="1" stop-color="#f7941d"/>
    </linearGradient>
  </defs>
  <!-- montaña verde del logo -->
  <path d="M-10 200 L-10 168 C30 150 58 120 92 132 C120 142 150 118 214 150 L214 200 Z" fill="url(#inti-hill)"/>
  <path d="M-10 182 C40 170 70 152 104 160 C140 168 170 150 214 168 L214 200 L-10 200 Z" fill="#8dc63f" opacity="0.8"/>
  <g class="head-group">
    <!-- rayos del sol (giran lentamente) -->
    <g class="rays"><rect x="96" y="14" width="8" height="20" rx="4" fill="url(#inti-ray)" transform="rotate(0 100 96)"/><rect x="96" y="14" width="8" height="20" rx="4" fill="url(#inti-ray)" transform="rotate(30 100 96)"/><rect x="96" y="14" width="8" height="20" rx="4" fill="url(#inti-ray)" transform="rotate(60 100 96)"/><rect x="96" y="14" width="8" height="20" rx="4" fill="url(#inti-ray)" transform="rotate(90 100 96)"/><rect x="96" y="14" width="8" height="20" rx="4" fill="url(#inti-ray)" transform="rotate(120 100 96)"/><rect x="96" y="14" width="8" height="20" rx="4" fill="url(#inti-ray)" transform="rotate(150 100 96)"/><rect x="96" y="14" width="8" height="20" rx="4" fill="url(#inti-ray)" transform="rotate(180 100 96)"/><rect x="96" y="14" width="8" height="20" rx="4" fill="url(#inti-ray)" transform="rotate(210 100 96)"/><rect x="96" y="14" width="8" height="20" rx="4" fill="url(#inti-ray)" transform="rotate(240 100 96)"/><rect x="96" y="14" width="8" height="20" rx="4" fill="url(#inti-ray)" transform="rotate(270 100 96)"/><rect x="96" y="14" width="8" height="20" rx="4" fill="url(#inti-ray)" transform="rotate(300 100 96)"/><rect x="96" y="14" width="8" height="20" rx="4" fill="url(#inti-ray)" transform="rotate(330 100 96)"/></g>
    <!-- cuerpo del sol -->
    <circle cx="100" cy="96" r="50" fill="url(#inti-body)"/>
    <circle cx="100" cy="96" r="50" fill="none" stroke="#f7941d" stroke-width="2.5" opacity="0.6"/>
    <!-- espiral del logo -->
    <path d="M128 66 c-6 -6 -16 -4 -17 4 c-1 6 6 9 10 6 c3 -2 1 -6 -2 -5" fill="none" stroke="#f7941d" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
    <!-- mejillas -->
    <ellipse cx="74" cy="110" rx="9" ry="5.5" fill="#fb7185" opacity="0.5"/>
    <ellipse cx="126" cy="110" rx="9" ry="5.5" fill="#fb7185" opacity="0.5"/>
    <!-- ojos -->
    <g class="eyes-open">
      <g class="blink">
        <ellipse cx="84" cy="92" rx="10" ry="12" fill="#fff"/>
        <ellipse cx="116" cy="92" rx="10" ry="12" fill="#fff"/>
        <g class="pupils">
          <circle cx="84" cy="94" r="6" fill="#3b2412"/><circle cx="86.3" cy="91.5" r="2" fill="#fff"/>
          <circle cx="116" cy="94" r="6" fill="#3b2412"/><circle cx="118.3" cy="91.5" r="2" fill="#fff"/>
        </g>
      </g>
      <path class="tear" d="M74 106 q-3 6 0 8 q3 -2 0 -8z" fill="#38bdf8"/>
    </g>
    <g class="eyes-happy" stroke="#3b2412" stroke-width="4" stroke-linecap="round" fill="none">
      <path d="M75 94 q9 -11 18 0"/><path d="M107 94 q9 -11 18 0"/>
    </g>
    <!-- boca -->
    <g class="mouth">
      <path class="mouth-normal" d="M88 115 q12 11 24 0" stroke="#7c2d12" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path class="mouth-sad" d="M89 121 q11 -9 22 0" stroke="#7c2d12" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path class="mouth-happy" d="M85 113 q15 18 30 0z" stroke="#7c2d12" stroke-width="3" stroke-linejoin="round" fill="#fb7185"/>
    </g>
  </g>
  <!-- manitos de sol que tapan los ojos -->
  <g class="arm arm-left">
    <path d="M52 210 C52 170 60 132 72 108 C76 100 86 100 88 108 C90 116 82 126 80 136 C76 160 74 186 76 210 Z" fill="url(#inti-hand)"/>
    <circle cx="84" cy="94" r="16" fill="url(#inti-hand)" stroke="#f7941d" stroke-width="2"/>
    <path d="M76 84 v-8 M84 81 v-9 M92 84 v-8" stroke="#f7941d" stroke-width="5" stroke-linecap="round"/>
  </g>
  <g class="arm arm-right">
    <path d="M148 210 C148 170 140 132 128 108 C124 100 114 100 112 108 C110 116 118 126 120 136 C124 160 126 186 124 210 Z" fill="url(#inti-hand)"/>
    <circle cx="116" cy="94" r="16" fill="url(#inti-hand)" stroke="#f7941d" stroke-width="2"/>
    <path d="M108 84 v-8 M116 81 v-9 M124 84 v-8" stroke="#f7941d" stroke-width="5" stroke-linecap="round"/>
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
