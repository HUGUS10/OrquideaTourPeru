// =====================================================================
// Visita virtual inmersiva — Orquídea Tour Perú
// - Tour 360° por escenas (fotos 360° reales) con menú, miniaturas,
//   flechas y puntos de salto dentro de la imagen.
// - Si un destino no tiene escenas: vista panorámica con paradas guiadas.
// - "4D": momento del día (amanecer, mediodía, atardecer, noche) y
//   recorrido automático.
// =====================================================================
(() => {
    const PANNELLUM_JS = 'https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.js';
    const PANNELLUM_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.css';
    const WIKI = 'https://upload.wikimedia.org/wikipedia/commons/thumb/';
    const WIKI_CREDIT = 'Johnattan Rupire · CC BY-SA 4.0 · Wikimedia Commons';

    // Escenas 360° libres incluidas (se usan si la base de datos aún no tiene escenas).
    const BUILTIN_SCENES = {
        cusco: [
            ['Plaza de Armas', 'Corazón de la ciudad imperial, rodeada de portales coloniales.', '3/30/Plaza_de_armas_del_Cusco%2C_vista_360.jpg', 'Plaza_de_armas_del_Cusco,_vista_360.jpg'],
            ['Catedral del Cusco', 'Joya del barroco andino construida sobre un palacio inca.', '1/1d/Actual_catedra%C4%BA_del_Cusco%2C_Plaza_de_armas.jpg', 'Actual_catedra%C4%BA_del_Cusco,_Plaza_de_armas.jpg'],
            ['Iglesia de la Plaza', 'Templos coloniales que enmarcan la plaza principal.', '9/9d/Vista_360_plaza_del_Cusco%2C_Iglesia.jpg', 'Vista_360_plaza_del_Cusco,_Iglesia.jpg'],
            ['Templo de la Sagrada Familia', 'Capilla colonial junto a la Catedral.', 'c/c7/Vista_360_del_tempro_de_La_Sagrada_Familia_en_el_Cusco.jpg', 'Vista_360_del_tempro_de_La_Sagrada_Familia_en_el_Cusco.jpg'],
            ['Calles de San Blas', 'Subida empedrada entre Tandapata y Kiskapata, junto al mirador.', 'f/f3/Subida_entre_las_calles_Tandapata_y_Kiskapata%2C_al_lado_del_Mirador_de_San_Blas%2C_Cusco.jpg', 'Subida_entre_las_calles_Tandapata_y_Kiskapata,_al_lado_del_Mirador_de_San_Blas,_Cusco.jpg'],
            ['Vista de la ciudad', 'Panorámica de los techos de teja del Cusco.', '3/3e/Ciudad_del_cusco_vista_360.jpg', 'Ciudad_del_cusco_vista_360.jpg'],
            ['Kusilluchayuq (Templo de los Monos)', 'Huaca inca tallada en la roca, a las afueras de la ciudad.', '3/39/Kusilluchayuq%2C_Cusco%2C_360.jpg', 'Kusilluchayuq,_Cusco,_360.jpg'],
            ['Huaca de la Luna', 'Santuario inca de piedra rodeado de campiña andina.', 'd/d9/Huaca_de_la_Luna%2C_Cusco%2C_360.jpg', 'Huaca_de_la_Luna,_Cusco,_360.jpg'],
            ['Camino Inca al Antisuyu', 'Tramo original del Qhapaq Ñan que salía del Cusco.', 'a/aa/Camino_Inca_al_Antisuyu_360.jpg', 'Camino_Inca_al_Antisuyu_360.jpg']
        ].map(([title, description, path, file], index) => {
            const name = path.split('/').pop();
            return { id: `builtin-${index}`, title, description, image: `${WIKI}${path}/3840px-${name}`, credit: WIKI_CREDIT, creditUrl: `https://commons.wikimedia.org/wiki/File:${file}`, yaw: 0, pitch: 0 };
        })
    };

    const FALLBACK = {
        cusco: { name: 'Cusco & Machu Picchu', region: 'Sierra Sur', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377', externalTourUrl: 'https://machupicchu360.com/tour-virtual-360/', externalTourLabel: 'Tour 360° de Machu Picchu' },
        arequipa: { name: 'Arequipa & Colca', region: 'Sur del Perú', image: 'https://images.unsplash.com/photo-1589553416260-f586c8f1514f' },
        ica: { name: 'Paracas & Huacachina', region: 'Costa Sur', image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9' },
        puno: { name: 'Puno & Titicaca', region: 'Altiplano', image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa' }
    };

    const STOPS = {
        cusco: [['Llegada a la ciudadela', 'Primer vistazo a las terrazas incas entre montañas.'], ['Templo del Sol', 'Muros de piedra tallada con precisión milimétrica.'], ['Huayna Picchu', 'La montaña icónica que custodia Machu Picchu.'], ['Terrazas agrícolas', 'Andenes donde los incas cultivaban a gran altura.'], ['Mirador final', 'La postal clásica antes de descender al pueblo.']],
        arequipa: [['Plaza de Armas', 'La Ciudad Blanca y sus portales de sillar.'], ['Volcán Misti', 'El guardián de Arequipa, a 5 822 m s. n. m.'], ['Cañón del Colca', 'Uno de los cañones más profundos del mundo.'], ['Cruz del Cóndor', 'Mirador para ver volar al cóndor andino.'], ['Baños termales', 'Relájate en las aguas de La Calera.']],
        ica: [['Islas Ballestas', 'Lobos marinos, pingüinos y aves guaneras.'], ['Reserva de Paracas', 'Desierto que se encuentra con el océano.'], ['Oasis de Huacachina', 'Laguna rodeada de palmeras y dunas.'], ['Tubulares y sandboard', 'Adrenalina sobre las dunas doradas.'], ['Atardecer en las dunas', 'El sol cae sobre el desierto de Ica.']],
        puno: [['Puerto de Puno', 'Punto de partida hacia el lago sagrado.'], ['Islas de los Uros', 'Islas flotantes hechas de totora.'], ['Isla Taquile', 'Tejidos declarados patrimonio de la humanidad.'], ['Lago Titicaca', 'El lago navegable más alto del mundo.'], ['Cielo del altiplano', 'Noches estrelladas a 3 800 m de altura.']]
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

    const $ = selector => modal.querySelector(selector);
    const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const smallScreen = () => Math.min(window.screen.width, window.screen.height) < 820;

    function sizedImage(url) {
        // En celulares se usa la versión de 1920 px (más liviana).
        return smallScreen() ? url.replace('/3840px-', '/1920px-') : url;
    }

    function thumbImage(url) {
        if (url.includes('upload.wikimedia.org')) return url.replace(/\/\d+px-/, '/1280px-');
        if (url.includes('images.unsplash.com')) return `${url.split('?')[0]}?q=60&w=400&h=200&fit=crop&auto=format`;
        return url;
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
        if (!scenes || !scenes.length) scenes = BUILTIN_SCENES[slug] || [];
        if (!scenes.length && fromDb?.tourUrl && fromDb.tourIs360) {
            scenes = [{ id: 'own-360', title: fromDb.name, description: fromDb.description || '', image: fromDb.tourUrl, credit: '', creditUrl: '', yaw: 0, pitch: 0 }];
        }
        return {
            slug,
            name: fromDb?.name || fallback.name,
            region: fromDb?.region || fallback.region || '',
            description: fromDb?.description || '',
            image: fromDb?.tourUrl && !fromDb.tourIs360 ? fromDb.tourUrl : (fromDb?.image || fallback.image || ''),
            keywords: fromDb?.keywords || [],
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

    // ---------- navegación ----------
    function items() {
        return current.mode === 'tour' ? current.scenes : current.stops.map(([title, description]) => ({ title, description }));
    }

    function step(delta) {
        const total = items().length;
        if (!total) return;
        goTo((current.index + delta + total) % total);
    }

    function goTo(index, fromViewer = false) {
        if (!current) return;
        const item = items()[index];
        if (!item) return;
        current.index = index;
        $('#vt-select').value = String(index);
        modal.querySelectorAll('[data-index]').forEach(element => {
            const active = Number(element.dataset.index) === index;
            element.classList.toggle('is-active', active);
            if (active && element.closest('#vt-thumbs')) element.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
        showCaption(`${index + 1}. ${item.title}`, item.description || '');
        if (current.mode === 'tour') {
            updateCredit(item);
            if (!fromViewer && viewer && viewer.getScene() !== `s${index}`) {
                modal.classList.add('is-switching');
                viewer.loadScene(`s${index}`, item.pitch || 0, item.yaw || 0, viewer.getHfov());
            }
        } else if (viewer) {
            viewer.stopAutoRotate();
            $('#vt-rotate').setAttribute('aria-pressed', 'false');
            viewer.lookAt(index % 2 ? 3 : -2, current.angles[index], Math.max(30, (current.fitHfov || 70) - 8), 1800);
        }
    }

    function updateCredit(scene) {
        $('#vt-credit').innerHTML = scene?.credit
            ? `<i class="fa-solid fa-camera" aria-hidden="true"></i> Foto 360°: ${scene.creditUrl ? `<a href="${esc(scene.creditUrl)}" target="_blank" rel="noopener">${esc(scene.credit)}</a>` : esc(scene.credit)}`
            : '';
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
        const total = items().length;
        if (!total) return;
        let position = 0;
        const run = () => {
            if (position >= total) { stopGuided(); return; }
            setTime(TIMES[Math.min(TIMES.length - 1, Math.floor((position / total) * TIMES.length))].id);
            goTo(position);
            if (viewer && current.mode === 'tour') setTimeout(() => viewer?.startAutoRotate(-3), 1200);
            $('#vt-progress-bar').style.width = `${((position + 1) / total) * 100}%`;
            position += 1;
        };
        $('#vt-play').innerHTML = '<i class="fa-solid fa-pause" aria-hidden="true"></i>';
        $('#vt-play').setAttribute('aria-label', 'Pausar recorrido');
        run();
        guidedTimer = setInterval(run, current.mode === 'tour' ? 8000 : 5200);
    }

    // ---------- configuración de Pannellum ----------
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

    function tourConfig() {
        const scenes = {};
        const total = current.scenes.length;
        current.scenes.forEach((scene, index) => {
            const next = current.scenes[(index + 1) % total];
            const prev = current.scenes[(index - 1 + total) % total];
            const yaw = scene.yaw || 0;
            const hotSpots = [{ pitch: 14, yaw, type: 'info', cssClass: 'vt-banner-hs', createTooltipFunc: bannerTooltip, createTooltipArgs: scene.title }];
            if (total > 1) {
                hotSpots.push({ pitch: -5, yaw: yaw + 40, type: 'scene', sceneId: `s${(index + 1) % total}`, cssClass: 'vt-nav-hs', createTooltipFunc: navTooltip, createTooltipArgs: { dir: 'next', label: `Ir a: ${next.title}` } });
                if (total > 2) hotSpots.push({ pitch: -5, yaw: yaw - 40, type: 'scene', sceneId: `s${(index - 1 + total) % total}`, cssClass: 'vt-nav-hs', createTooltipFunc: navTooltip, createTooltipArgs: { dir: 'prev', label: `Volver a: ${prev.title}` } });
            }
            scenes[`s${index}`] = { title: scene.title, type: 'equirectangular', panorama: sizedImage(scene.image), yaw, pitch: scene.pitch || 0, hotSpots };
        });
        return {
            default: {
                firstScene: 's0',
                sceneFadeDuration: 900,
                autoLoad: true,
                autoRotate: -2,
                autoRotateInactivityDelay: 5000,
                showControls: false,
                compass: false,
                hfov: smallScreen() ? 95 : 105,
                minHfov: 35,
                maxHfov: 120,
                crossOrigin: 'anonymous'
            },
            scenes
        };
    }

    function panoramaConfig() {
        let source = current.image;
        let haov = 120;
        let vaov = 60;
        if (/images\.unsplash\.com/.test(source)) {
            source = `${source.split('?')[0]}?q=80&w=3200&h=1600&fit=crop&auto=format`;
            haov = 130;
            vaov = 65;
        }
        const box = $('#vt-viewer').getBoundingClientRect();
        const fitHfov = Math.round(Math.max(30, Math.min(90, vaov * 0.85 * (box.width / Math.max(box.height, 1)))));
        current.fitHfov = fitHfov;
        const span = Math.max(20, haov - 70);
        current.angles = current.stops.map((_, index, list) => (list.length === 1 ? 0 : -span / 2 + (span / (list.length - 1)) * index));
        return {
            type: 'equirectangular', panorama: source, haov, vaov, vOffset: 0,
            minYaw: -haov / 2, maxYaw: haov / 2, minPitch: -vaov / 2, maxPitch: vaov / 2,
            autoLoad: true, autoRotate: -2, autoRotateInactivityDelay: 4000, showControls: false, compass: false,
            hfov: fitHfov, minHfov: 30, maxHfov: fitHfov, crossOrigin: 'anonymous'
        };
    }

    function renderNavigation() {
        const list = items();
        $('#vt-select').innerHTML = list.map((item, index) => `<option value="${index}">${index + 1}. ${esc(item.title)}</option>`).join('');
        $('#vt-list-items').innerHTML = list.map((item, index) => `<li><button type="button" data-index="${index}"><span class="vt-num">${index + 1}</span>${esc(item.title)}</button></li>`).join('');
        $('#vt-thumbs').innerHTML = current.mode === 'tour'
            ? list.map((item, index) => `<button type="button" class="vt-thumb" data-index="${index}" aria-label="${index + 1}. ${esc(item.title)}"><img src="${esc(thumbImage(item.image))}" alt="" loading="lazy" decoding="async"><span>${index + 1}. ${esc(item.title)}</span></button>`).join('')
            : list.map((item, index) => `<button type="button" class="vt-chip" data-index="${index}"><span class="vt-num">${index + 1}</span> ${esc(item.title)}</button>`).join('');
        modal.querySelectorAll('[data-index]').forEach(element => element.addEventListener('click', () => {
            stopGuided();
            goTo(Number(element.dataset.index));
            if (element.closest('#vt-list')) togglePanel('#vt-list', '#vt-btn-list');
        }));
        const multiple = list.length > 1;
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
        if (!destination) { closeTour(); return; }
        const mode = destination.scenes.length ? 'tour' : 'panorama';
        current = { ...destination, mode, index: 0, stops: STOPS[slug] || [[destination.name, destination.description || 'Explora el destino con tu guía.']] };

        $('#vt-title').textContent = destination.name;
        const region = destination.region ? `${destination.region} · ` : '';
        $('#vt-subtitle').textContent = mode === 'tour' ? `${region}Perú · ${destination.scenes.length} escenas 360°` : `${region}Perú · vista panorámica`;
        const external = $('#vt-external');
        external.hidden = !destination.externalTourUrl;
        if (destination.externalTourUrl) {
            external.href = destination.externalTourUrl;
            external.querySelector('span').textContent = destination.externalTourLabel;
        }
        $('#vt-credit').innerHTML = '';
        $('.vt-caption').classList.remove('show');
        setTime('mediodia');
        renderNavigation();

        try {
            await loadPannellum();
            viewer?.destroy();
            viewer = window.pannellum.viewer('vt-viewer', mode === 'tour' ? tourConfig() : panoramaConfig());
            viewer.on('load', () => {
                modal.classList.remove('is-loading', 'is-switching');
                $('#vt-gyro').hidden = !viewer.isOrientationSupported();
            });
            viewer.on('scenechange', sceneId => {
                const index = Number(String(sceneId).slice(1)) || 0;
                if (index !== current.index) goTo(index, true);
            });
            viewer.on('error', () => {
                modal.classList.remove('is-loading', 'is-switching');
                showCaption('No se pudo cargar la imagen de la visita', 'Revisa tu conexión o prueba otra escena.');
            });
            viewer.on('mousedown', stopGuided);
            viewer.on('touchstart', stopGuided);
            goTo(0);
        } catch (error) {
            modal.classList.remove('is-loading');
            showCaption('No se pudo abrir la visita', error.message);
        }
    }

    function closeTour() {
        stopGuided();
        if (!modal) return;
        if (document.fullscreenElement) document.exitFullscreen?.();
        modal.classList.remove('is-open', 'is-loading', 'is-switching');
        document.body.classList.remove('modal-open');
        try { viewer?.stopOrientation(); } catch (error) { /* sin giroscopio */ }
        viewer?.destroy();
        viewer = null;
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
