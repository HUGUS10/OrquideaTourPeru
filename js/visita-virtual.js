// =====================================================================
// Visita virtual inmersiva (3D + tiempo = "4D")
// - Visor panorámico/360° con Pannellum (arrastrar, zoom, giroscopio).
// - Paradas guiadas: la cámara gira hacia cada punto de la visita.
// - Momento del día: amanecer, mediodía, atardecer y noche.
// - "Vive el día": recorrido automático que avanza por paradas y horas.
// =====================================================================
(() => {
    const PANNELLUM_JS = 'https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.js';
    const PANNELLUM_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.css';

    const FALLBACK = {
        cusco: { name: 'Cusco & Machu Picchu', region: 'Sierra Sur', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377' },
        arequipa: { name: 'Arequipa & Colca', region: 'Sur del Perú', image: 'https://images.unsplash.com/photo-1589553416260-f586c8f1514f' },
        ica: { name: 'Paracas & Huacachina', region: 'Costa Sur', image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9' },
        puno: { name: 'Puno & Titicaca', region: 'Altiplano', image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa' }
    };

    const STOPS = {
        cusco: [
            ['Llegada a la ciudadela', 'Primer vistazo a las terrazas incas entre montañas.'],
            ['Templo del Sol', 'Muros de piedra tallada con precisión milimétrica.'],
            ['Huayna Picchu', 'La montaña icónica que custodia Machu Picchu.'],
            ['Terrazas agrícolas', 'Andenes donde los incas cultivaban a gran altura.'],
            ['Mirador final', 'La postal clásica antes de descender al pueblo.']
        ],
        arequipa: [
            ['Plaza de Armas', 'La Ciudad Blanca y sus portales de sillar.'],
            ['Volcán Misti', 'El guardián de Arequipa, a 5 822 m s. n. m.'],
            ['Cañón del Colca', 'Uno de los cañones más profundos del mundo.'],
            ['Cruz del Cóndor', 'Mirador para ver volar al cóndor andino.'],
            ['Baños termales', 'Relájate en las aguas de La Calera.']
        ],
        ica: [
            ['Islas Ballestas', 'Lobos marinos, pingüinos y aves guaneras.'],
            ['Reserva de Paracas', 'Desierto que se encuentra con el océano.'],
            ['Oasis de Huacachina', 'Laguna rodeada de palmeras y dunas.'],
            ['Tubulares y sandboard', 'Adrenalina sobre las dunas doradas.'],
            ['Atardecer en las dunas', 'El sol cae sobre el desierto de Ica.']
        ],
        puno: [
            ['Puerto de Puno', 'Punto de partida hacia el lago sagrado.'],
            ['Islas de los Uros', 'Islas flotantes hechas de totora.'],
            ['Isla Taquile', 'Tejidos declarados patrimonio de la humanidad.'],
            ['Lago Titicaca', 'El lago navegable más alto del mundo.'],
            ['Cielo del altiplano', 'Noches estrelladas a 3 800 m de altura.']
        ]
    };

    const TIMES = [
        { id: 'amanecer', label: 'Amanecer', icon: 'fa-cloud-sun', hour: '06:00' },
        { id: 'mediodia', label: 'Mediodía', icon: 'fa-sun', hour: '12:00' },
        { id: 'atardecer', label: 'Atardecer', icon: 'fa-cloud-moon', hour: '17:30' },
        { id: 'noche', label: 'Noche', icon: 'fa-moon', hour: '21:00' }
    ];

    let viewer = null;
    let modal = null;
    let current = null;
    let tourTimer = null;
    let pannellumPromise = null;

    function esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    }

    function loadPannellum() {
        if (window.pannellum) return Promise.resolve();
        if (pannellumPromise) return pannellumPromise;
        pannellumPromise = new Promise((resolve, reject) => {
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = PANNELLUM_CSS;
            document.head.append(css);
            const script = document.createElement('script');
            script.src = PANNELLUM_JS;
            script.onload = resolve;
            script.onerror = () => { pannellumPromise = null; reject(new Error('No se pudo cargar el visor 360°.')); };
            document.head.append(script);
        });
        return pannellumPromise;
    }

    function findDestination(slug) {
        const list = Array.isArray(window.destinations) ? window.destinations : (typeof destinations !== 'undefined' && Array.isArray(destinations) ? destinations : []);
        const fromDb = list.find(item => item.slug === slug);
        const fallback = FALLBACK[slug];
        if (!fromDb && !fallback) return null;
        return {
            slug,
            name: fromDb?.name || fallback.name,
            region: fromDb?.region || fallback?.region || '',
            description: fromDb?.description || '',
            image: fromDb?.image || fallback?.image || '',
            tourUrl: fromDb?.tourUrl || '',
            tourIs360: Boolean(fromDb?.tourIs360),
            keywords: fromDb?.keywords || []
        };
    }

    function stopsFor(destination) {
        if (STOPS[destination.slug]) return STOPS[destination.slug];
        const words = [destination.name, ...destination.keywords].filter(Boolean).slice(0, 5);
        return words.map((word, index) => [index === 0 ? `Bienvenida a ${word}` : word.charAt(0).toUpperCase() + word.slice(1), destination.description || 'Explora cada rincón con tu guía.']);
    }

    // Construye la configuración del panorama: 360° real o panorámica amplia.
    function panoramaConfig(destination) {
        if (destination.tourUrl && destination.tourIs360) {
            return { panorama: destination.tourUrl, haov: 360, vaov: 180, full: true };
        }
        let source = destination.tourUrl || destination.image;
        if (/images\.unsplash\.com/.test(source)) {
            const base = source.split('?')[0];
            source = `${base}?q=80&w=3200&h=1600&fit=crop&auto=format`;
            return { panorama: source, haov: 130, vaov: 65, full: false };
        }
        return { panorama: source, haov: 120, vaov: 60, full: false };
    }

    function stopAngles(count, config) {
        const span = config.full ? 300 : Math.max(20, config.haov - 70);
        return Array.from({ length: count }, (_, index) => (count === 1 ? 0 : -span / 2 + (span / (count - 1)) * index));
    }

    function buildModal() {
        modal = document.createElement('div');
        modal.id = 'virtual-tour';
        modal.className = 'vt-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'vt-title');
        modal.innerHTML = `
            <div class="vt-stage">
                <div id="vt-viewer" class="vt-viewer"></div>
                <div class="vt-tint" aria-hidden="true"></div>
                <div class="vt-stars" aria-hidden="true"></div>
                <div class="vt-loading" aria-live="polite"><span class="vt-spinner"></span><span>Preparando tu visita…</span></div>
                <header class="vt-top">
                    <div class="min-w-0">
                        <p class="vt-kicker"><i class="fa-solid fa-vr-cardboard" aria-hidden="true"></i> Visita virtual <span id="vt-mode"></span></p>
                        <h2 id="vt-title" class="vt-title"></h2>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <button type="button" class="vt-icon" id="vt-gyro" hidden aria-label="Mover con el celular" title="Mover con el celular"><i class="fa-solid fa-mobile-screen-button" aria-hidden="true"></i></button>
                        <button type="button" class="vt-icon" id="vt-rotate" aria-pressed="true" aria-label="Pausar giro automático" title="Giro automático"><i class="fa-solid fa-rotate" aria-hidden="true"></i></button>
                        <button type="button" class="vt-icon" data-vt-close aria-label="Cerrar visita virtual" title="Cerrar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
                    </div>
                </header>
                <div class="vt-caption" aria-live="polite"><strong id="vt-stop-title"></strong><span id="vt-stop-text"></span></div>
                <p class="vt-hint"><i class="fa-solid fa-hand-pointer" aria-hidden="true"></i> Arrastra para mirar alrededor · pellizca o usa la rueda para acercar</p>
            </div>
            <div class="vt-panel">
                <div class="vt-row">
                    <span class="vt-label">Momento del día</span>
                    <div class="vt-chips" id="vt-times" role="radiogroup" aria-label="Momento del día"></div>
                </div>
                <div class="vt-row">
                    <span class="vt-label">Paradas del recorrido</span>
                    <div class="vt-chips vt-scroll" id="vt-stops"></div>
                </div>
                <div class="vt-actions">
                    <button type="button" id="vt-play" class="vt-btn vt-btn-primary"><i class="fa-solid fa-play" aria-hidden="true"></i> Vive el día completo</button>
                    <button type="button" id="vt-packages" class="vt-btn"><i class="fa-solid fa-suitcase-rolling" aria-hidden="true"></i> Ver paquetes</button>
                    <div class="vt-progress" aria-hidden="true"><span id="vt-progress-bar"></span></div>
                </div>
            </div>`;
        document.body.append(modal);
        modal.querySelector('[data-vt-close]').addEventListener('click', closeTour);
        modal.addEventListener('keydown', event => { if (event.key === 'Escape') closeTour(); });
        modal.querySelector('#vt-play').addEventListener('click', () => (tourTimer ? stopGuided() : playGuided()));
        modal.querySelector('#vt-packages').addEventListener('click', () => {
            const slug = current?.slug;
            closeTour();
            if (slug && typeof filterPackagesByDestination === 'function') filterPackagesByDestination(slug);
            else document.getElementById('paquetes')?.scrollIntoView({ behavior: 'smooth' });
        });
        modal.querySelector('#vt-rotate').addEventListener('click', event => {
            const button = event.currentTarget;
            const on = button.getAttribute('aria-pressed') !== 'true';
            button.setAttribute('aria-pressed', String(on));
            button.setAttribute('aria-label', on ? 'Pausar giro automático' : 'Activar giro automático');
            if (!viewer) return;
            on ? viewer.startAutoRotate(-2) : viewer.stopAutoRotate();
        });
        modal.querySelector('#vt-gyro').addEventListener('click', event => {
            if (!viewer) return;
            const button = event.currentTarget;
            if (viewer.isOrientationActive()) {
                viewer.stopOrientation();
                button.setAttribute('aria-pressed', 'false');
            } else {
                viewer.startOrientation();
                button.setAttribute('aria-pressed', 'true');
            }
        });
        const times = modal.querySelector('#vt-times');
        times.innerHTML = TIMES.map(time => `<button type="button" role="radio" aria-checked="false" class="vt-chip" data-time="${time.id}"><i class="fa-solid ${time.icon}" aria-hidden="true"></i> ${time.label} <small>${time.hour}</small></button>`).join('');
        times.addEventListener('click', event => {
            const chip = event.target.closest('[data-time]');
            if (!chip) return;
            stopGuided();
            setTime(chip.dataset.time);
        });
    }

    function setTime(timeId) {
        if (!modal) return;
        modal.dataset.time = timeId;
        modal.querySelectorAll('[data-time]').forEach(chip => chip.setAttribute('aria-checked', String(chip.dataset.time === timeId)));
    }

    function goToStop(index, animate = true) {
        if (!current) return;
        const stop = current.stops[index];
        if (!stop) return;
        current.stopIndex = index;
        modal.querySelectorAll('[data-stop]').forEach(chip => chip.classList.toggle('is-active', Number(chip.dataset.stop) === index));
        modal.querySelector(`[data-stop="${index}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        const caption = modal.querySelector('.vt-caption');
        caption.classList.remove('show');
        void caption.offsetWidth;
        modal.querySelector('#vt-stop-title').textContent = `${index + 1}. ${stop[0]}`;
        modal.querySelector('#vt-stop-text').textContent = stop[1];
        caption.classList.add('show');
        if (viewer) {
            viewer.stopAutoRotate();
            modal.querySelector('#vt-rotate').setAttribute('aria-pressed', 'false');
            viewer.lookAt(index % 2 ? 3 : -2, current.angles[index], current.config.full ? 95 : Math.max(30, (current.fitHfov || 70) - 8), animate ? 1800 : false);
        }
    }

    function stopGuided() {
        clearInterval(tourTimer);
        tourTimer = null;
        if (!modal) return;
        modal.querySelector('#vt-play').innerHTML = '<i class="fa-solid fa-play" aria-hidden="true"></i> Vive el día completo';
        modal.querySelector('#vt-progress-bar').style.width = '0%';
    }

    function playGuided() {
        if (!current) return;
        const total = current.stops.length;
        let step = 0;
        const run = () => {
            if (step >= total) {
                stopGuided();
                return;
            }
            const time = TIMES[Math.min(TIMES.length - 1, Math.floor((step / total) * TIMES.length))];
            setTime(time.id);
            goToStop(step);
            modal.querySelector('#vt-progress-bar').style.width = `${((step + 1) / total) * 100}%`;
            step += 1;
        };
        modal.querySelector('#vt-play').innerHTML = '<i class="fa-solid fa-pause" aria-hidden="true"></i> Pausar recorrido';
        run();
        tourTimer = setInterval(run, 5200);
    }

    async function openVirtualTour(slug) {
        const destination = findDestination(slug);
        if (!destination) return;
        if (!modal) buildModal();
        stopGuided();
        const config = panoramaConfig(destination);
        const stops = stopsFor(destination);
        current = { ...destination, config, stops, angles: stopAngles(stops.length, config), stopIndex: 0 };

        modal.querySelector('#vt-title').textContent = destination.name;
        modal.querySelector('#vt-mode').textContent = config.full ? '· 360° real' : '· vista panorámica';
        modal.querySelector('#vt-stops').innerHTML = stops.map((stop, index) => `<button type="button" class="vt-chip" data-stop="${index}"><span class="vt-num">${index + 1}</span> ${esc(stop[0])}</button>`).join('');
        modal.querySelectorAll('[data-stop]').forEach(chip => chip.addEventListener('click', () => { stopGuided(); goToStop(Number(chip.dataset.stop)); }));
        modal.querySelector('.vt-caption').classList.remove('show');
        modal.classList.add('is-open', 'is-loading');
        document.body.classList.add('modal-open');
        setTime('mediodia');
        modal.querySelector('[data-vt-close]').focus();

        try {
            await loadPannellum();
            viewer?.destroy();
            const box = modal.querySelector('#vt-viewer').getBoundingClientRect();
            const aspect = box.width / Math.max(box.height, 1);
            // Zoom inicial calculado para que la imagen siempre llene la pantalla
            const fitHfov = Math.round(Math.max(30, Math.min(90, config.vaov * 0.85 * aspect)));
            const limits = config.full ? {} : {
                minYaw: -config.haov / 2,
                maxYaw: config.haov / 2,
                minPitch: -config.vaov / 2,
                maxPitch: config.vaov / 2
            };
            current.fitHfov = fitHfov;
            viewer = window.pannellum.viewer('vt-viewer', {
                ...limits,
                type: 'equirectangular',
                panorama: config.panorama,
                haov: config.haov,
                vaov: config.vaov,
                vOffset: 0,
                autoLoad: true,
                autoRotate: -2,
                autoRotateInactivityDelay: 4000,
                showControls: true,
                showFullscreenCtrl: true,
                showZoomCtrl: true,
                compass: false,
                hfov: config.full ? 100 : fitHfov,
                minHfov: 30,
                maxHfov: config.full ? 120 : fitHfov,
                crossOrigin: 'anonymous',
                strings: { loadingLabel: 'Cargando…', loadButtonLabel: 'Cargar visita', bylineLabel: '', noPanoramaError: 'No se encontró la imagen.', fileAccessError: 'No se pudo abrir la imagen.', genericWebGLError: 'Tu navegador no soporta WebGL.', textureSizeError: 'La imagen es demasiado grande para este dispositivo.' }
            });
            viewer.on('load', () => {
                modal.classList.remove('is-loading');
                modal.querySelector('#vt-gyro').hidden = !viewer.isOrientationSupported();
                modal.querySelector('#vt-rotate').setAttribute('aria-pressed', 'true');
            });
            viewer.on('error', () => modal.classList.remove('is-loading'));
            viewer.on('mousedown', stopGuided);
            viewer.on('touchstart', stopGuided);
        } catch (error) {
            modal.classList.remove('is-loading');
            modal.querySelector('#vt-stop-title').textContent = 'No se pudo abrir la visita';
            modal.querySelector('#vt-stop-text').textContent = error.message;
            modal.querySelector('.vt-caption').classList.add('show');
        }
    }

    function closeTour() {
        stopGuided();
        if (!modal) return;
        modal.classList.remove('is-open');
        document.body.classList.remove('modal-open');
        try { viewer?.stopOrientation(); } catch (error) { /* sin giroscopio */ }
        viewer?.destroy();
        viewer = null;
    }

    function destinationForText(text) {
        const haystack = String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        const list = (typeof destinations !== 'undefined' && Array.isArray(destinations) && destinations.length) ? destinations : Object.keys(FALLBACK).map(slug => ({ slug, keywords: { cusco: ['cusco', 'machu'], arequipa: ['arequipa', 'colca'], ica: ['ica', 'paracas', 'huacachina'], puno: ['puno', 'titicaca'] }[slug] }));
        return list.find(item => [item.slug, ...(item.keywords || [])].some(word => word && haystack.includes(String(word).toLowerCase())))?.slug || '';
    }

    window.openVirtualTour = openVirtualTour;
    window.closeVirtualTour = closeTour;
    window.destinationForText = destinationForText;
})();
