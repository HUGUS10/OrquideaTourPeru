// =====================================================================
// Visita virtual inmersiva — Orquídea Tour Perú
// - Recorrido por escenas: fotos 360° completas y panorámicas amplias.
// - Menú numerado, miniaturas, flechas y puntos de salto en la imagen.
// - "4D": momento del día (amanecer, mediodía, atardecer, noche) y
//   recorrido automático.
// - Las fotos se cargan como imagen normal y se entregan al visor ya
//   descargadas (funciona aunque haya bloqueadores de privacidad).
// =====================================================================
(() => {
    const PANNELLUM_JS = 'https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.js';
    const PANNELLUM_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.css';
    const WIKI = 'https://upload.wikimedia.org/wikipedia/commons/thumb/';

    // Foto de Wikimedia Commons con licencia libre (se muestra el crédito obligatorio).
    function wiki(path, title, description, author, license, options = {}) {
        const name = path.split('/').pop();
        return {
            title,
            description,
            image: `${WIKI}${path}/3840px-${name}`,
            credit: `${author} · ${license} · Wikimedia Commons`,
            creditUrl: `https://commons.wikimedia.org/wiki/File:${name}`,
            is360: Boolean(options.is360),
            haov: options.haov || 0,
            yaw: options.yaw || 0,
            pitch: options.pitch || 0
        };
    }

    const RUPIRE = ['Johnattan Rupire', 'CC BY-SA 4.0'];
    const DELSO = ['Diego Delso', 'CC BY-SA 4.0'];

    // Recorridos incluidos (se usan si el destino aún no tiene escenas propias en la base de datos).
    const BUILTIN_SCENES = {
        cusco: [
            wiki('a/a8/99_-_Machu_Picchu_-_Juin_2009.jpg', 'Machu Picchu: vista clásica', 'La ciudadela inca con el Huayna Picchu al fondo.', 'Martin St-Amant', 'CC BY-SA 3.0', { haov: 190 }),
            wiki('c/c5/Machu_Picchu_panorama.jpg', 'Machu Picchu: panorámica', 'Terrazas, templos y plazas entre montañas y nubes.', 'Brian Jeffery Beggerly', 'CC BY 2.0', { haov: 140 }),
            wiki('6/6e/1_pano_machu_picchu_guard_house_river_2014.jpg', 'Casa del Guardián y río Urubamba', 'El mirador más famoso, sobre el valle del Urubamba.', 'Chensiyuan', 'CC BY-SA 3.0', { haov: 110 }),
            wiki('3/30/Plaza_de_armas_del_Cusco%2C_vista_360.jpg', 'Plaza de Armas del Cusco', 'Corazón de la ciudad imperial, rodeada de portales coloniales.', ...RUPIRE, { is360: true }),
            wiki('1/1d/Actual_catedra%C4%BA_del_Cusco%2C_Plaza_de_armas.jpg', 'Catedral del Cusco', 'Joya del barroco andino construida sobre un palacio inca.', ...RUPIRE, { is360: true }),
            wiki('9/9d/Vista_360_plaza_del_Cusco%2C_Iglesia.jpg', 'Iglesia de la Plaza', 'Templos coloniales que enmarcan la plaza principal.', ...RUPIRE, { is360: true }),
            wiki('f/f3/Subida_entre_las_calles_Tandapata_y_Kiskapata%2C_al_lado_del_Mirador_de_San_Blas%2C_Cusco.jpg', 'Calles de San Blas', 'Subida empedrada entre Tandapata y Kiskapata, junto al mirador.', ...RUPIRE, { is360: true }),
            wiki('3/3e/Ciudad_del_cusco_vista_360.jpg', 'Vista de la ciudad', 'Panorámica de los techos de teja del Cusco.', ...RUPIRE, { is360: true }),
            wiki('3/39/Kusilluchayuq%2C_Cusco%2C_360.jpg', 'Kusilluchayuq (Templo de los Monos)', 'Huaca inca tallada en la roca, a las afueras de la ciudad.', ...RUPIRE, { is360: true }),
            wiki('d/d9/Huaca_de_la_Luna%2C_Cusco%2C_360.jpg', 'Huaca de la Luna', 'Santuario inca de piedra rodeado de campiña andina.', ...RUPIRE, { is360: true }),
            wiki('a/aa/Camino_Inca_al_Antisuyu_360.jpg', 'Camino Inca al Antisuyu', 'Tramo original del Qhapaq Ñan que salía del Cusco.', ...RUPIRE, { is360: true })
        ],
        arequipa: [
            wiki('a/a2/Panor%C3%A1mica_cerca_de_Arequipa%2C_Per%C3%BA%2C_2015-08-02%2C_DD_04-07_PAN.JPG', 'Volcanes de Arequipa', 'El Misti, el Chachani y el Pichu Pichu custodian la Ciudad Blanca.', ...DELSO, { haov: 180 }),
            wiki('a/a0/Colca_Canyon_Panorama.jpg', 'Cañón del Colca', 'Uno de los cañones más profundos del mundo.', 'Ivan Mlinaric', 'CC BY 2.0', { haov: 190 }),
            wiki('7/7a/Colca_Valley_Panorama.jpg', 'Valle del Colca', 'Andenes preincas que siguen cultivándose hoy.', 'Ivan Mlinaric', 'CC BY 2.0', { haov: 170 }),
            wiki('f/fc/Colca_canyon_panorama.jpg', 'Mirador del Colca', 'Vista de casi 360° desde el borde del cañón.', 'Cédric Liénart', 'CC BY-SA 3.0', { haov: 340 })
        ],
        ica: [
            wiki('b/b8/Vista_panor%C3%A0mica_de_Huacachina.jpg', 'Oasis de Huacachina', 'Laguna rodeada de palmeras y dunas gigantes.', 'Pitxiquin', 'CC BY-SA 4.0', { haov: 200 }),
            wiki('f/fc/Huacachina_Oasis_Panorama.JPG', 'Huacachina desde las dunas', 'Punto de partida de los tubulares y el sandboard.', 'Kob123456', 'CC BY-SA 4.0', { haov: 140 }),
            wiki('f/f8/Paracas_-_pou%C5%A1%C5%A5_-_panoramio.jpg', 'Desierto de Paracas', 'La reserva donde el desierto se encuentra con el océano.', 'Pavel Špindler', 'CC BY 3.0', { haov: 130 }),
            wiki('1/1d/Ballestas_Islands_P%C3%A9rou_2011.jpg', 'Islas Ballestas', 'Lobos marinos, pingüinos de Humboldt y aves guaneras.', 'Pierre André Leclercq', 'CC BY-SA 4.0', { haov: 115 })
        ],
        puno: [
            wiki('c/c7/Islas_flotantes_de_los_Uros%2C_Lago_Titicaca%2C_Per%C3%BA%2C_2015-08-01%2C_DD_44-48_PAN.jpg', 'Islas flotantes de los Uros', 'Islas construidas a mano con totora.', ...DELSO, { haov: 220 }),
            wiki('c/c7/Vista_de_Puno_y_el_Titicaca%2C_Per%C3%BA%2C_2015-08-01%2C_DD_64-72_PAN.JPG', 'Puno y el lago Titicaca', 'La ciudad junto al lago navegable más alto del mundo.', ...DELSO, { haov: 360 }),
            wiki('f/f1/Islas_flotantes_de_los_Uros%2C_Lago_Titicaca%2C_Per%C3%BA%2C_2015-08-01%2C_DD_19.JPG', 'Vida en los Uros', 'Casas y botes tradicionales de totora.', ...DELSO, { haov: 110 }),
            wiki('3/35/Amanecer_en_el_lago_Titicaca%2C_Puno%2C_Per%C3%BA%2C_2015-08-01%2C_DD_01.JPG', 'Amanecer en el Titicaca', 'El sol nace sobre el lago sagrado de los incas.', ...DELSO, { haov: 100 })
        ]
    };

    const FALLBACK = {
        cusco: { name: 'Cusco & Machu Picchu', region: 'Sierra Sur', externalTourUrl: 'https://machupicchu360.com/tour-virtual-360/', externalTourLabel: 'Tour 360° de Machu Picchu' },
        arequipa: { name: 'Arequipa & Colca', region: 'Sur del Perú' },
        ica: { name: 'Paracas & Huacachina', region: 'Costa Sur' },
        puno: { name: 'Puno & Titicaca', region: 'Altiplano' }
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
    let guidedTimer = null;
    let pannellumPromise = null;
    let loadToken = 0;
    let maxTexture = 0;
    const blobCache = new Map();

    const $ = selector => modal.querySelector(selector);
    const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const smallScreen = () => Math.min(window.screen.width, window.screen.height) < 820;

    function sizedImage(url) {
        return smallScreen() ? url.replace('/3840px-', '/1920px-') : url;
    }

    function thumbImage(url) {
        if (url.includes('upload.wikimedia.org')) return url.replace(/\/\d+px-/, '/1280px-');
        if (url.includes('images.unsplash.com')) return `${url.split('?')[0]}?q=60&w=400&h=200&fit=crop&auto=format`;
        return url;
    }

    function textureLimit() {
        if (maxTexture) return maxTexture;
        try {
            const gl = document.createElement('canvas').getContext('webgl');
            maxTexture = Math.min(gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 4096, 4096);
        } catch (error) {
            maxTexture = 4096;
        }
        return maxTexture;
    }

    // Carga la foto como <img> (permitida por img-src) y la convierte en blob local para el visor.
    function loadPanorama(url) {
        if (blobCache.has(url)) return Promise.resolve(blobCache.get(url));
        return new Promise(resolve => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.decoding = 'async';
            image.onload = () => {
                const width = image.naturalWidth;
                const height = image.naturalHeight;
                try {
                    const scale = Math.min(1, textureLimit() / width);
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.round(width * scale);
                    canvas.height = Math.round(height * scale);
                    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(blob => {
                        const result = { url: blob ? URL.createObjectURL(blob) : url, width, height, local: Boolean(blob) };
                        blobCache.set(url, result);
                        resolve(result);
                    }, 'image/jpeg', 0.9);
                } catch (error) {
                    resolve({ url, width, height, local: false });
                }
            };
            image.onerror = () => resolve({ url, width: 0, height: 0, failed: true });
            image.src = url;
        });
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

    function destinationList() {
        return typeof destinations !== 'undefined' && Array.isArray(destinations) ? destinations : [];
    }

    async function resolveDestination(slug) {
        const fromDb = destinationList().find(item => item.slug === slug);
        const fallback = FALLBACK[slug] || {};
        if (!fromDb && !FALLBACK[slug]) return null;
        let scenes = null;
        if (fromDb?.id && window.OrquideasStore?.loadTourScenes) {
            try { scenes = await window.OrquideasStore.loadTourScenes(fromDb.id); } catch (error) { scenes = null; }
        }
        const legacySeed = scenes?.length && !scenes[0].hasTypeColumns && BUILTIN_SCENES[slug];
        if (!scenes || !scenes.length || legacySeed) scenes = BUILTIN_SCENES[slug] || [];
        if (!scenes.length && fromDb?.tourUrl) {
            scenes = [{ title: fromDb.name, description: fromDb.description || '', image: fromDb.tourUrl, credit: '', creditUrl: '', is360: fromDb.tourIs360, haov: 0, yaw: 0, pitch: 0 }];
        }
        if (!scenes.length && fromDb?.image) {
            scenes = [{ title: fromDb.name, description: fromDb.description || '', image: fromDb.image, credit: '', creditUrl: '', is360: false, haov: 120, yaw: 0, pitch: 0 }];
        }
        return {
            slug,
            name: fromDb?.name || fallback.name,
            region: fromDb?.region || fallback.region || '',
            externalTourUrl: fromDb?.externalTourUrl || fallback.externalTourUrl || '',
            externalTourLabel: fromDb?.externalTourLabel || fallback.externalTourLabel || 'Tour 360° oficial',
            scenes
        };
    }

    // ---------- interfaz ----------
    function buildModal() {
        modal = document.createElement('div');
        modal.id = 'virtual-tour';
        modal.className = 'vt-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'vt-title');
        const railButton = (id, icon, label, extra = '') => `<button type="button" class="vt-icon" id="${id}" aria-label="${label}" title="${label}" ${extra}><i class="fa-solid ${icon}" aria-hidden="true"></i></button>`;
        modal.innerHTML = `
            <div class="vt-stage">
                <div id="vt-viewer" class="vt-viewer"></div>
                <div class="vt-tint" aria-hidden="true"></div>
                <div class="vt-stars" aria-hidden="true"></div>
                <div class="vt-loading" aria-live="polite"><span class="vt-spinner"></span><span>Preparando tu visita…</span></div>

                <div class="vt-brand">
                    <h2 id="vt-title" class="vt-brand-name"></h2>
                    <p class="vt-brand-sub" id="vt-subtitle"></p>
                    <label class="sr-only" for="vt-select">Escena</label>
                    <select id="vt-select" class="vt-select"></select>
                </div>

                <nav class="vt-rail" aria-label="Controles de la visita">
                    ${railButton('vt-close', 'fa-xmark', 'Cerrar visita')}
                    ${railButton('vt-btn-list', 'fa-list-ol', 'Lista de escenas', 'aria-expanded="false"')}
                    ${railButton('vt-btn-thumbs', 'fa-table-cells-large', 'Miniaturas', 'aria-expanded="true"')}
                    ${railButton('vt-btn-time', 'fa-clock', 'Momento del día', 'aria-expanded="false"')}
                    ${railButton('vt-play', 'fa-play', 'Recorrido automático')}
                    ${railButton('vt-rotate', 'fa-rotate', 'Giro automático', 'aria-pressed="true"')}
                    ${railButton('vt-gyro', 'fa-mobile-screen-button', 'Mover con el celular', 'hidden aria-pressed="false"')}
                    ${railButton('vt-zoom-in', 'fa-magnifying-glass-plus', 'Acercar')}
                    ${railButton('vt-zoom-out', 'fa-magnifying-glass-minus', 'Alejar')}
                    ${railButton('vt-fullscreen', 'fa-expand', 'Pantalla completa')}
                </nav>

                <aside class="vt-list" id="vt-list" hidden><ol id="vt-list-items"></ol></aside>
                <div class="vt-time-pop" id="vt-time-pop" hidden role="radiogroup" aria-label="Momento del día"></div>

                <button type="button" class="vt-arrow vt-prev" id="vt-prev" aria-label="Escena anterior"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
                <button type="button" class="vt-arrow vt-next" id="vt-next" aria-label="Escena siguiente"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>

                <div class="vt-caption" aria-live="polite"><strong id="vt-stop-title"></strong><span id="vt-stop-text"></span></div>
                <p class="vt-hint"><i class="fa-solid fa-hand-pointer" aria-hidden="true"></i> Arrastra para mirar alrededor · toca los puntos para avanzar</p>

                <div class="vt-bottom">
                    <div class="vt-thumbs" id="vt-thumbs"></div>
                    <div class="vt-footer">
                        <span class="vt-credit" id="vt-credit"></span>
                        <div class="vt-footer-actions">
                            <a id="vt-external" class="vt-btn" target="_blank" rel="noopener" hidden><i class="fa-solid fa-up-right-from-square" aria-hidden="true"></i><span></span></a>
                            <button type="button" id="vt-packages" class="vt-btn vt-btn-primary"><i class="fa-solid fa-suitcase-rolling" aria-hidden="true"></i> Ver paquetes</button>
                        </div>
                    </div>
                    <div class="vt-progress" aria-hidden="true"><span id="vt-progress-bar"></span></div>
                </div>
            </div>`;
        document.body.append(modal);

        $('#vt-time-pop').innerHTML = TIMES.map(time => `<button type="button" role="radio" aria-checked="false" class="vt-chip" data-time="${time.id}"><i class="fa-solid ${time.icon}" aria-hidden="true"></i> ${time.label} <small>${time.hour}</small></button>`).join('');

        $('#vt-close').addEventListener('click', closeTour);
        modal.addEventListener('keydown', event => {
            if (event.key === 'Escape') closeTour();
            if (event.key === 'ArrowRight' && event.target.tagName !== 'SELECT') step(1);
            if (event.key === 'ArrowLeft' && event.target.tagName !== 'SELECT') step(-1);
        });
        $('#vt-prev').addEventListener('click', () => { stopGuided(); step(-1); });
        $('#vt-next').addEventListener('click', () => { stopGuided(); step(1); });
        $('#vt-select').addEventListener('change', event => { stopGuided(); goTo(Number(event.target.value)); });
        $('#vt-play').addEventListener('click', () => (guidedTimer ? stopGuided() : playGuided()));
        $('#vt-btn-list').addEventListener('click', () => togglePanel('#vt-list', '#vt-btn-list'));
        $('#vt-btn-time').addEventListener('click', () => togglePanel('#vt-time-pop', '#vt-btn-time'));
        $('#vt-btn-thumbs').addEventListener('click', () => {
            const open = modal.classList.toggle('thumbs-hidden') === false;
            $('#vt-btn-thumbs').setAttribute('aria-expanded', String(open));
        });
        $('#vt-time-pop').addEventListener('click', event => {
            const chip = event.target.closest('[data-time]');
            if (!chip) return;
            stopGuided();
            setTime(chip.dataset.time);
        });
        $('#vt-rotate').addEventListener('click', event => {
            const on = event.currentTarget.getAttribute('aria-pressed') !== 'true';
            event.currentTarget.setAttribute('aria-pressed', String(on));
            if (viewer) on ? viewer.startAutoRotate(-2) : viewer.stopAutoRotate();
        });
        $('#vt-gyro').addEventListener('click', event => {
            if (!viewer) return;
            const active = viewer.isOrientationActive();
            active ? viewer.stopOrientation() : viewer.startOrientation();
            event.currentTarget.setAttribute('aria-pressed', String(!active));
        });
        $('#vt-zoom-in').addEventListener('click', () => viewer?.setHfov(viewer.getHfov() - 12, 400));
        $('#vt-zoom-out').addEventListener('click', () => viewer?.setHfov(viewer.getHfov() + 12, 400));
        $('#vt-fullscreen').addEventListener('click', () => {
            if (document.fullscreenElement) document.exitFullscreen?.();
            else modal.requestFullscreen?.().catch(() => {});
        });
        $('#vt-packages').addEventListener('click', () => {
            const slug = current?.slug;
            closeTour();
            if (slug && typeof filterPackagesByDestination === 'function') filterPackagesByDestination(slug);
            else document.getElementById('paquetes')?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    function togglePanel(panelSelector, buttonSelector) {
        const panel = $(panelSelector);
        const open = panel.hidden;
        ['#vt-list', '#vt-time-pop'].forEach(selector => { $(selector).hidden = true; });
        ['#vt-btn-list', '#vt-btn-time'].forEach(selector => $(selector).setAttribute('aria-expanded', 'false'));
        panel.hidden = !open;
        $(buttonSelector).setAttribute('aria-expanded', String(open));
    }

    function setTime(timeId) {
        modal.dataset.time = timeId;
        modal.querySelectorAll('[data-time]').forEach(chip => chip.setAttribute('aria-checked', String(chip.dataset.time === timeId)));
    }

    function showCaption(title, text) {
        const caption = $('.vt-caption');
        caption.classList.remove('show');
        void caption.offsetWidth;
        $('#vt-stop-title').textContent = title;
        $('#vt-stop-text').textContent = text;
        caption.classList.add('show');
    }

    function updateCredit(scene) {
        $('#vt-credit').innerHTML = scene?.credit
            ? `<i class="fa-solid fa-camera" aria-hidden="true"></i> Foto: ${scene.creditUrl ? `<a href="${esc(scene.creditUrl)}" target="_blank" rel="noopener">${esc(scene.credit)}</a>` : esc(scene.credit)}`
            : '';
    }

    // ---------- navegación ----------
    function step(delta) {
        const total = current?.scenes.length || 0;
        if (!total) return;
        goTo((current.index + delta + total) % total);
    }

    function goTo(index) {
        if (!current) return;
        const scene = current.scenes[index];
        if (!scene) return;
        current.index = index;
        $('#vt-select').value = String(index);
        modal.querySelectorAll('[data-index]').forEach(element => {
            const active = Number(element.dataset.index) === index;
            element.classList.toggle('is-active', active);
            if (active && element.closest('#vt-thumbs')) element.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
        showCaption(`${index + 1}. ${scene.title}`, scene.description || '');
        updateCredit(scene);
        showScene(index);
    }

    function stopGuided() {
        clearInterval(guidedTimer);
        guidedTimer = null;
        if (!modal) return;
        $('#vt-play').innerHTML = '<i class="fa-solid fa-play" aria-hidden="true"></i>';
        $('#vt-play').setAttribute('aria-label', 'Recorrido automático');
        $('#vt-progress-bar').style.width = '0%';
    }

    function playGuided() {
        const total = current?.scenes.length || 0;
        if (!total) return;
        let position = 0;
        const run = () => {
            if (position >= total) { stopGuided(); return; }
            setTime(TIMES[Math.min(TIMES.length - 1, Math.floor((position / total) * TIMES.length))].id);
            goTo(position);
            $('#vt-progress-bar').style.width = `${((position + 1) / total) * 100}%`;
            position += 1;
        };
        $('#vt-play').innerHTML = '<i class="fa-solid fa-pause" aria-hidden="true"></i>';
        $('#vt-play').setAttribute('aria-label', 'Pausar recorrido');
        run();
        guidedTimer = setInterval(run, 8000);
    }

    // ---------- visor ----------
    function bannerTooltip(div, text) {
        div.classList.add('vt-banner');
        const label = document.createElement('span');
        label.textContent = text;
        div.append(label);
    }

    function navTooltip(div, args) {
        div.classList.add('vt-nav', args.dir === 'next' ? 'vt-nav-next' : 'vt-nav-prev');
        div.innerHTML = `<i class="fa-solid fa-chevron-${args.dir === 'next' ? 'right' : 'left'}" aria-hidden="true"></i>`;
        const label = document.createElement('span');
        label.className = 'vt-nav-label';
        label.textContent = args.label;
        div.append(label);
    }

    async function showScene(index) {
        const token = ++loadToken;
        const scene = current.scenes[index];
        modal.classList.add('is-switching');
        const data = await loadPanorama(sizedImage(scene.image));
        if (token !== loadToken || !modal.classList.contains('is-open')) return;
        if (data.failed) {
            modal.classList.remove('is-loading', 'is-switching');
            showCaption('No se pudo cargar esta escena', 'Revisa tu conexión o prueba la siguiente.');
            return;
        }

        const aspect = data.width / data.height;
        const box = $('#vt-viewer').getBoundingClientRect();
        const screenAspect = box.width / Math.max(box.height, 1);
        const full = scene.is360 && aspect > 1.9 && aspect < 2.1;
        const haov = full ? 360 : Math.min(360, scene.haov || Math.max(90, Math.round(48 * aspect)));
        const vaov = full ? 180 : Math.min(150, haov / aspect);
        const wraps = haov >= 359;
        // Zoom inicial: el campo vertical visible nunca supera la altura de la foto (sin bandas negras).
        const rad = Math.PI / 180;
        const hfovForVertical = 2 * Math.atan(Math.tan((vaov * 0.94 * rad) / 2) * screenAspect) / rad;
        const fitHfov = full ? (smallScreen() ? 95 : 105) : Math.round(Math.max(12, Math.min(100, hfovForVertical, wraps ? 100 : haov * 0.92)));

        const total = current.scenes.length;
        const sideYaw = full || wraps ? 40 : Math.max(10, Math.min(40, haov / 2 - fitHfov / 4));
        const hotSpots = [{ pitch: full ? 12 : vaov * 0.22, yaw: scene.yaw || 0, type: 'info', cssClass: 'vt-banner-hs', createTooltipFunc: bannerTooltip, createTooltipArgs: scene.title }];
        if (total > 1) {
            const next = current.scenes[(index + 1) % total];
            const prev = current.scenes[(index - 1 + total) % total];
            hotSpots.push({ pitch: full ? -5 : -vaov * 0.15, yaw: (scene.yaw || 0) + sideYaw, type: 'info', cssClass: 'vt-nav-hs', createTooltipFunc: navTooltip, createTooltipArgs: { dir: 'next', label: `Ir a: ${next.title}` }, clickHandlerFunc: () => { stopGuided(); step(1); } });
            if (total > 2) hotSpots.push({ pitch: full ? -5 : -vaov * 0.15, yaw: (scene.yaw || 0) - sideYaw, type: 'info', cssClass: 'vt-nav-hs', createTooltipFunc: navTooltip, createTooltipArgs: { dir: 'prev', label: `Volver a: ${prev.title}` }, clickHandlerFunc: () => { stopGuided(); step(-1); } });
        }

        const config = {
            type: 'equirectangular',
            panorama: data.url,
            haov,
            vaov,
            vOffset: 0,
            yaw: scene.yaw || 0,
            pitch: scene.pitch || 0,
            hfov: fitHfov,
            minHfov: full ? 30 : Math.min(30, fitHfov),
            maxHfov: full ? 120 : fitHfov,
            autoLoad: true,
            autoRotate: $('#vt-rotate').getAttribute('aria-pressed') === 'true' ? -2 : 0,
            autoRotateInactivityDelay: 5000,
            showControls: false,
            compass: false,
            hotSpots
        };
        if (!full) {
            config.minPitch = -vaov / 2;
            config.maxPitch = vaov / 2;
            if (!wraps) {
                config.minYaw = -haov / 2;
                config.maxYaw = haov / 2;
            }
        }
        if (!data.local) config.crossOrigin = 'anonymous';

        try {
            await loadPannellum();
            if (token !== loadToken) return;
            try { viewer?.destroy(); } catch (error) { /* ya destruido */ }
            viewer = window.pannellum.viewer('vt-viewer', config);
            viewer.on('load', () => {
                if (token !== loadToken) return;
                modal.classList.remove('is-loading', 'is-switching');
                $('#vt-gyro').hidden = !viewer.isOrientationSupported();
            });
            viewer.on('error', () => {
                modal.classList.remove('is-loading', 'is-switching');
                showCaption('No se pudo mostrar esta escena', 'Prueba con la siguiente.');
            });
            viewer.on('mousedown', stopGuided);
            viewer.on('touchstart', stopGuided);
            // Precarga la siguiente escena para que el cambio sea instantáneo
            const nextScene = current.scenes[(index + 1) % current.scenes.length];
            if (nextScene) loadPanorama(sizedImage(nextScene.image));
        } catch (error) {
            modal.classList.remove('is-loading', 'is-switching');
            showCaption('No se pudo abrir la visita', error.message);
        }
    }

    function renderNavigation() {
        const scenes = current.scenes;
        $('#vt-select').innerHTML = scenes.map((scene, index) => `<option value="${index}">${index + 1}. ${esc(scene.title)}</option>`).join('');
        $('#vt-list-items').innerHTML = scenes.map((scene, index) => `<li><button type="button" data-index="${index}"><span class="vt-num">${index + 1}</span>${esc(scene.title)}</button></li>`).join('');
        $('#vt-thumbs').innerHTML = scenes.map((scene, index) => `<button type="button" class="vt-thumb" data-index="${index}" aria-label="${index + 1}. ${esc(scene.title)}"><img src="${esc(thumbImage(scene.image))}" alt="" loading="lazy" decoding="async"><span>${index + 1}. ${esc(scene.title)}${scene.is360 ? ' · 360°' : ''}</span></button>`).join('');
        modal.querySelectorAll('[data-index]').forEach(element => element.addEventListener('click', () => {
            stopGuided();
            goTo(Number(element.dataset.index));
            if (element.closest('#vt-list')) togglePanel('#vt-list', '#vt-btn-list');
        }));
        const multiple = scenes.length > 1;
        $('#vt-prev').hidden = !multiple;
        $('#vt-next').hidden = !multiple;
    }

    async function openVirtualTour(slug) {
        if (!modal) buildModal();
        stopGuided();
        modal.classList.add('is-open', 'is-loading');
        document.body.classList.add('modal-open');
        $('#vt-close').focus();

        const destination = await resolveDestination(slug);
        if (!destination || !destination.scenes.length) {
            showCaption('Este destino aún no tiene visita virtual', 'Pronto agregaremos fotos 360°.');
            modal.classList.remove('is-loading');
            return;
        }
        current = { ...destination, index: 0 };
        const fullCount = destination.scenes.filter(scene => scene.is360).length;
        $('#vt-title').textContent = destination.name;
        $('#vt-subtitle').textContent = `${destination.region ? `${destination.region} · ` : ''}Perú · ${destination.scenes.length} escenas${fullCount ? ` · ${fullCount} en 360°` : ' panorámicas'}`;
        const external = $('#vt-external');
        external.hidden = !destination.externalTourUrl;
        if (destination.externalTourUrl) {
            external.href = destination.externalTourUrl;
            external.querySelector('span').textContent = destination.externalTourLabel;
        }
        setTime('mediodia');
        renderNavigation();
        goTo(0);
    }

    function closeTour() {
        stopGuided();
        loadToken += 1;
        if (!modal) return;
        if (document.fullscreenElement) document.exitFullscreen?.();
        modal.classList.remove('is-open', 'is-loading', 'is-switching');
        document.body.classList.remove('modal-open');
        try { viewer?.stopOrientation(); } catch (error) { /* sin giroscopio */ }
        try { viewer?.destroy(); } catch (error) { /* ya destruido */ }
        viewer = null;
        blobCache.forEach(entry => { if (entry.local) URL.revokeObjectURL(entry.url); });
        blobCache.clear();
    }

    function destinationForText(text) {
        const haystack = String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        const defaults = { cusco: ['cusco', 'machu'], arequipa: ['arequipa', 'colca'], ica: ['ica', 'paracas', 'huacachina'], puno: ['puno', 'titicaca'] };
        const list = destinationList().length ? destinationList() : Object.keys(defaults).map(slug => ({ slug, keywords: defaults[slug] }));
        return list.find(item => [item.slug, ...(item.keywords || [])].some(word => word && haystack.includes(String(word).toLowerCase())))?.slug || '';
    }

    window.openVirtualTour = openVirtualTour;
    window.closeVirtualTour = closeTour;
    window.destinationForText = destinationForText;
})();
