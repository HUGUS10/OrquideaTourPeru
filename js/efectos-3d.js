// Efectos 3D de la portada: tarjetas con inclinación y brillo,
// aparición suave al hacer scroll y profundidad (parallax) en la portada.
(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // --- Tarjetas con inclinación 3D (solo con mouse) ---
    const MAX_TILT = 9;
    function attachTilt(card) {
        if (card.dataset.tiltReady || reduceMotion || !finePointer) return;
        card.dataset.tiltReady = '1';
        card.classList.add('tilt-3d');
        if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
        const glare = document.createElement('span');
        glare.className = 'tilt-glare';
        glare.setAttribute('aria-hidden', 'true');
        card.append(glare);
        let frame = null;
        card.addEventListener('pointermove', event => {
            const rect = card.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                card.classList.add('is-tilting');
                card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * MAX_TILT}deg) rotateY(${(x - 0.5) * MAX_TILT}deg) translateY(-4px)`;
                card.style.setProperty('--gx', `${x * 100}%`);
                card.style.setProperty('--gy', `${y * 100}%`);
            });
        });
        card.addEventListener('pointerleave', () => {
            cancelAnimationFrame(frame);
            card.classList.remove('is-tilting');
            card.style.transform = '';
        });
    }

    // --- Aparición al hacer scroll ---
    const revealObserver = 'IntersectionObserver' in window && !reduceMotion
        ? new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
                setTimeout(() => { entry.target.style.transitionDelay = ''; }, 1200);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
        : null;

    function attachReveal(element, delay = 0) {
        if (!revealObserver || element.dataset.revealReady) return;
        element.dataset.revealReady = '1';
        element.classList.add('reveal');
        element.style.transitionDelay = `${delay}ms`;
        revealObserver.observe(element);
    }

    function enhance() {
        document.querySelectorAll('#destination-grid > article, #package-catalog > article').forEach((card, index) => {
            attachTilt(card);
            attachReveal(card, (index % 4) * 90);
        });
        document.querySelectorAll('main section > div > .text-center, main section .max-w-7xl > div:first-child, #nosotros > div > div').forEach((block, index) => attachReveal(block, (index % 2) * 120));
    }

    // Re-aplica cuando el catálogo o los destinos se cargan desde Supabase
    ['destination-grid', 'package-catalog'].forEach(id => {
        const target = document.getElementById(id);
        if (target) new MutationObserver(enhance).observe(target, { childList: true });
    });
    enhance();

    // --- Parallax de la portada ---
    const hero = document.getElementById('hero');
    const content = hero?.querySelector(':scope > div');
    if (hero && content && !reduceMotion) {
        content.classList.add('hero-layer');
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const offset = Math.min(window.scrollY, hero.offsetHeight);
                hero.style.backgroundPosition = `center calc(50% + ${offset * 0.35}px)`;
                content.style.transform = `translate3d(0, ${offset * 0.15}px, 0)`;
                content.style.opacity = String(Math.max(0.2, 1 - offset / (hero.offsetHeight * 1.1)));
                ticking = false;
            });
        }, { passive: true });
        if (finePointer) {
            hero.addEventListener('pointermove', event => {
                if (window.scrollY > 40) return;
                const rect = hero.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width - 0.5;
                const y = (event.clientY - rect.top) / rect.height - 0.5;
                content.style.transform = `perspective(1200px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`;
            });
            hero.addEventListener('pointerleave', () => { if (window.scrollY <= 40) content.style.transform = ''; });
        }
    }
})();
