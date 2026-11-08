
        let bookings = [];
        let packages = [];
        let promotions = [];
        let invoices = [];
        let complaints = [];
        let currentUser = { id: '', name: '', firstName: '', lastName: '', document: '', phone: '', email: '', avatar: '' };
        let isClientAuthenticated = false;
        let isAdminAuthenticated = false;
        let pendingProfileAvatar = '';
        let pendingProfileAvatarPath = null;
        let pendingPackageImage = '';
        let currentSelectedPackage = {
            id: '',
            name: '',
            price: 0,
            stock: 0
        };

        function appPagePath(fileName) {
            return window.location.pathname.toLowerCase().includes('/html/') ? fileName : `html/${fileName}`;
        }

        function navigatePage(fileName) {
            window.location.href = appPagePath(fileName);
        }

        function returnToAccount() {
            navigatePage(isAdminAuthenticated ? 'admin.html' : 'admin_cliente.html');
        }

        function dismissAuthGate() {
            document.getElementById('auth-gate')?.classList.add('hidden');
        }

        function switchView(viewName) {
            const targetId = { landing: 'view-landing', 'client-panel': 'view-client-panel', 'admin-panel': 'view-admin-panel' }[viewName];
            if (!targetId) return;
            if (!document.getElementById(targetId)) {
                const destinations = { landing: window.location.pathname.toLowerCase().includes('/html/') ? '../index.html' : 'index.html', 'client-panel': appPagePath('admin_cliente.html'), 'admin-panel': appPagePath('admin.html') };
                window.location.href = destinations[viewName];
                return;
            }
            if (!['view-landing', 'view-client-panel', 'view-admin-panel'].every(id => document.getElementById(id))) {
                if (viewName === 'client-panel') renderBookings();
                if (viewName === 'admin-panel') {
                    renderBookings();
                    renderAdminData();
                    initAdminCharts();
                }
                return;
            }
            document.getElementById('view-landing').classList.add('hidden');
            document.getElementById('view-client-panel').classList.add('hidden');
            document.getElementById('view-admin-panel').classList.add('hidden');

            if (viewName === 'landing') {
                document.getElementById('view-landing').classList.remove('hidden');
            } else if (viewName === 'client-panel') {
                document.getElementById('view-client-panel').classList.remove('hidden');
                renderBookings();
            } else if (viewName === 'admin-panel') {
                document.getElementById('view-admin-panel').classList.remove('hidden');
                renderBookings();
                renderAdminData();
                initAdminCharts();
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function toggleMobileMenu() {
            const menu = document.getElementById('mobile-menu');
            const button = document.getElementById('mobile-menu-toggle');
            const isOpen = !menu.classList.contains('hidden');
            menu.classList.toggle('hidden', isOpen);
            button.setAttribute('aria-expanded', String(!isOpen));
            button.setAttribute('aria-label', isOpen ? 'Abrir menú' : 'Cerrar menú');
            button.innerHTML = `<i class="fa-solid fa-${isOpen ? 'bars' : 'xmark'}" aria-hidden="true"></i>`;
        }

        function closeMobileMenu() {
            const menu = document.getElementById('mobile-menu');
            const button = document.getElementById('mobile-menu-toggle');
            menu.classList.add('hidden');
            button.setAttribute('aria-expanded', 'false');
            button.setAttribute('aria-label', 'Abrir menú');
            button.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
        }

        function renderAccountControls() {
            const controls = [document.getElementById('account-actions'), document.getElementById('mobile-account-actions')];
            const headerName = document.getElementById('client-header-name');
            const welcomeName = document.getElementById('client-welcome-name');
            if (headerName) headerName.textContent = currentUser.name;
            if (welcomeName) welcomeName.textContent = currentUser.name;
            const profileButton = `<button type="button" onclick="closeMobileMenu(); switchView('client-panel')" class="flex items-center justify-center gap-2 bg-brand-50 hover:bg-brand-100 text-brand-800 font-semibold px-4 py-2.5 rounded-lg text-sm"><i class="fa-solid fa-circle-user" aria-hidden="true"></i><span>Mi perfil</span><span class="hidden lg:inline">${escapeHtml(currentUser.name)}</span></button>`;
            const adminButton = `<button type="button" onclick="navigatePage('admin.html')" class="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow text-sm">Panel de administración</button>`;
            const authPath = window.location.pathname.toLowerCase().includes('/html/') ? '' : 'html/';
            const guestButtons = `<a href="${authPath}login.html" class="text-slate-700 hover:text-brand-600 font-semibold px-4 py-2.5 text-sm">Iniciar sesión</a><a href="${authPath}registro.html" class="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow text-sm">Registrarse</a>`;
            controls.forEach(control => {
                if (control) control.innerHTML = isAdminAuthenticated ? adminButton : isClientAuthenticated ? profileButton : guestButtons;
            });
            renderClientProfile();
        }

        function renderClientProfile() {
            const form = document.getElementById('client-profile-form');
            if (form) {
                form.elements.firstName.value = currentUser.firstName || '';
                form.elements.lastName.value = currentUser.lastName || '';
                form.elements.document.value = currentUser.document || '';
                form.elements.phone.value = currentUser.phone || '';
                form.elements.email.value = currentUser.email || '';
            }
            pendingProfileAvatar = currentUser.avatar || '';
            renderClientAvatar(pendingProfileAvatar);
        }

        function renderClientAvatar(source) {
            [['client-header-avatar', 'client-header-avatar-placeholder'], ['client-profile-avatar', 'client-profile-avatar-placeholder']].forEach(([imageId, placeholderId]) => {
                const image = document.getElementById(imageId);
                const placeholder = document.getElementById(placeholderId);
                if (!image || !placeholder) return;
                image.classList.toggle('hidden', !source);
                placeholder.classList.toggle('hidden', Boolean(source));
                if (source) image.src = source;
                else image.removeAttribute('src');
            });
        }

        function handleAvatarUpload(input) {
            const file = input.files?.[0];
            if (!file) return;
            if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
                input.value = '';
                showToast('Elige una imagen válida de hasta 2 MB.', 'rose');
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                pendingProfileAvatar = String(reader.result);
                renderClientAvatar(pendingProfileAvatar);
            };
            reader.readAsDataURL(file);
        }

        function clearClientAvatar() {
            pendingProfileAvatar = '';
            const input = document.getElementById('profile-avatar');
            if (input) input.value = '';
            renderClientAvatar('');
        }

        function resetClientProfile() {
            renderClientProfile();
            showToast('Se descartaron los cambios sin guardar.');
        }

        async function saveClientProfile(form) {
            const firstName = form.elements.firstName.value.trim();
            const lastName = form.elements.lastName.value.trim();
            const email = form.elements.email.value.trim().toLowerCase();
            const profile = {
                ...currentUser,
                firstName,
                lastName,
                name: `${firstName} ${lastName}`,
                document: form.elements.document.value.trim(),
                phone: form.elements.phone.value.trim(),
                email
            };
            try {
                const result = await window.OrquideasStore.saveProfile(currentUser.id, profile, pendingProfileAvatar);
                currentUser = { ...profile, email: result.profile.email || currentUser.email, avatar: result.avatarUrl, avatarPath: result.profile.avatar_path };
                if (result.emailChangePending) showToast('Perfil guardado. Confirma el cambio de correo desde tu bandeja de entrada.');
                else showToast('Tus datos de perfil se guardaron correctamente.');
                renderAccountControls();
                renderBookings();
            } catch (error) {
                showToast(error.message || 'No se pudo guardar el perfil en Supabase.', 'rose');
            }
        }

        function switchClientTab(tabName) {
            const showProfile = tabName === 'profile';
            document.getElementById('client-tab-home').classList.toggle('hidden', showProfile);
            document.getElementById('client-tab-profile').classList.toggle('hidden', !showProfile);
            const mobileNav = document.getElementById('client-mobile-nav');
            if (mobileNav.value !== tabName) mobileNav.value = tabName;
            if (showProfile) renderClientProfile();
            if (tabName === 'bookings') {
                document.getElementById('client-tab-home').classList.remove('hidden');
                document.getElementById('client-bookings').scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (!showProfile) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }

        async function signOut() {
            try {
                await window.supabaseClient.auth.signOut();
                window.location.replace(window.location.pathname.toLowerCase().includes('/html/') ? '../index.html' : 'index.html');
            } catch (error) {
                showToast(error.message || 'No se pudo cerrar la sesión.', 'rose');
            }
        }

        // Modales
        let lastFocusedBeforeModal = null;

        function openModal(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            lastFocusedBeforeModal = document.activeElement;
            modal.classList.remove('hidden');
            document.body.classList.add('modal-open');
            const focusTarget = modal.querySelector('button, [href], input:not([readonly]), select, textarea');
            focusTarget?.focus({ preventScroll: true });
        }

        function closeModal(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            modal.classList.add('hidden');
            if (!document.querySelector('[data-modal]:not(.hidden)')) document.body.classList.remove('modal-open');
            lastFocusedBeforeModal?.focus?.({ preventScroll: true });
        }

        // Cerrar modales con Escape o al tocar el fondo
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            const openModalEl = [...document.querySelectorAll('[data-modal]:not(.hidden)')].pop();
            if (openModalEl) closeModal(openModalEl.id);
            else if (!document.getElementById('mobile-menu')?.classList.contains('hidden')) closeMobileMenu();
        });
        document.addEventListener('click', event => {
            if (event.target.matches?.('[data-modal]')) closeModal(event.target.id);
        });

        // Scroll suave
        function scrollToSection(id) {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Fecha local en formato YYYY-MM-DD (evita desfases por zona horaria)
        function localIsoDate(offsetDays = 0) {
            const date = new Date();
            date.setDate(date.getDate() + offsetDays);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }

        // Filtro de paquetes por destino (buscador y tarjetas de destino)
        const DESTINATION_LABELS = { cusco: 'Cusco & Machu Picchu', arequipa: 'Arequipa & Colca', ica: 'Ica, Paracas & Huacachina', puno: 'Puno & Lago Titicaca' };
        const DESTINATION_KEYWORDS = { cusco: ['cusco', 'machu', 'picchu', 'valle sagrado'], arequipa: ['arequipa', 'colca'], ica: ['ica', 'paracas', 'huacachina', 'ballestas'], puno: ['puno', 'titicaca', 'uros'] };
        let activeDestinationFilter = '';
        let searchPreferences = { date: '', people: '' };

        function normalizeText(value) {
            return String(value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        }

        function applyPackageFilter() {
            const catalog = document.getElementById('package-catalog');
            const bar = document.getElementById('package-filter-bar');
            if (!catalog) return;
            const cards = [...catalog.querySelectorAll('article')];
            let visible = 0;
            cards.forEach(card => {
                const haystack = normalizeText(`${card.dataset.destination || ''} ${card.textContent}`);
                const match = !activeDestinationFilter || DESTINATION_KEYWORDS[activeDestinationFilter].some(word => haystack.includes(word));
                card.classList.toggle('hidden', !match);
                if (match) visible += 1;
            });
            let empty = document.getElementById('package-filter-empty');
            if (activeDestinationFilter && !visible) {
                if (!empty) {
                    empty = document.createElement('p');
                    empty.id = 'package-filter-empty';
                    empty.className = 'col-span-full py-10 text-center text-slate-600';
                    catalog.append(empty);
                }
                empty.innerHTML = 'Por ahora no tenemos paquetes publicados para este destino. <a class="font-bold text-brand-700 underline" target="_blank" rel="noopener" href="https://wa.me/51989851245">Escríbenos por WhatsApp</a> y armamos tu viaje.';
            } else {
                empty?.remove();
            }
            if (bar) {
                bar.classList.toggle('hidden', !activeDestinationFilter);
                const label = document.getElementById('package-filter-label');
                if (label) label.textContent = activeDestinationFilter ? `Mostrando paquetes para: ${DESTINATION_LABELS[activeDestinationFilter]} (${visible})` : '';
            }
        }

        function filterPackagesByDestination(destination) {
            activeDestinationFilter = DESTINATION_KEYWORDS[destination] ? destination : '';
            const select = document.getElementById('search-destination');
            if (select) select.value = activeDestinationFilter;
            applyPackageFilter();
            scrollToSection('paquetes');
        }

        function clearPackageFilter() {
            filterPackagesByDestination('');
        }

        function searchPackages(form) {
            searchPreferences = { date: form.elements.date?.value || '', people: form.elements.people?.value || '' };
            filterPackagesByDestination(form.elements.destination?.value || '');
        }

        // Detalle del paquete modal
        function openPackageDetail(title, dest, duration, price, stock, img) {
            document.getElementById('detail-title').innerText = title;
            document.getElementById('detail-destination').innerText = dest;
            document.getElementById('detail-duration').innerText = duration;
            document.getElementById('detail-price').innerText = `S/ ${price}`;
            document.getElementById('detail-stock').innerText = `${stock} cupos libres`;
            const detailImage = document.getElementById('detail-img');
            detailImage.src = img;
            detailImage.alt = `${title} - ${dest}`;
            ['detail-includes', 'detail-excludes'].forEach(id => {
                const container = document.getElementById(id);
                if (container) container.innerHTML = '<p class="text-slate-500">Consúltanos por WhatsApp para más detalles.</p>';
            });

            document.getElementById('btn-modal-reserve').onclick = function() {
                closeModal('modal-package-detail');
                selectPackageForBooking(title, price, stock);
            };

            openModal('modal-package-detail');
        }

        // Iniciar proceso de reserva
        function selectPackageForBooking(name, price, stock, packageId = '') {
            if (!isClientAuthenticated && !isAdminAuthenticated) {
                showToast('Inicia sesión o regístrate para reservar este paquete.', 'amber');
                const gate = document.getElementById('auth-gate');
                if (gate) gate.classList.remove('hidden');
                else navigatePage('login.html');
                return;
            }
            currentSelectedPackage = { id: packageId, name, price, stock };

            document.getElementById('book-pkg-name').innerText = name;
            document.getElementById('book-pkg-price-label').innerText = `S/ ${price} por persona`;
            document.getElementById('book-availability-badge').innerText = `${stock} cupos disponibles`;
            const holder = document.getElementById('book-holder');
            const holderDocument = document.getElementById('book-document');
            if (holder) holder.value = currentUser.name || '';
            if (holderDocument) holderDocument.value = currentUser.document || '';
            const dateInput = document.getElementById('book-date');
            dateInput.min = localIsoDate();
            if (searchPreferences.date && searchPreferences.date >= dateInput.min) dateInput.value = searchPreferences.date;
            else if (!dateInput.value || dateInput.value < dateInput.min) dateInput.value = localIsoDate(1);
            const passengersSelect = document.getElementById('book-passengers');
            if (searchPreferences.people && passengersSelect.querySelector(`option[value="${searchPreferences.people}"]`)) passengersSelect.value = searchPreferences.people;

            // Reset pasos
            document.getElementById('booking-step-1').classList.remove('hidden');
            document.getElementById('booking-step-2').classList.add('hidden');
            document.getElementById('booking-step-3').classList.add('hidden');

            calculateBookingTotal();
            openModal('modal-booking');
        }

        // Cálculo dinámico de totales
        function calculateBookingTotal() {
            const passengers = parseInt(document.getElementById('book-passengers').value);
            const total = passengers * currentSelectedPackage.price;
            const remaining = Math.max(0, currentSelectedPackage.stock - passengers);

            document.getElementById('calc-price-person').innerText = `S/ ${currentSelectedPackage.price}`;
            document.getElementById('calc-passengers-count').innerText = passengers;
            document.getElementById('calc-remaining-stock').innerText = `${remaining} cupos disponibles después de la reserva`;
            document.getElementById('calc-total').innerText = `S/ ${total.toLocaleString()}`;
        }

        // Transición a Paso 2 en Reserva
        function goToBookingStep2() {
            const passengers = parseInt(document.getElementById('book-passengers').value);
            const date = document.getElementById('book-date').value;
            if (passengers > currentSelectedPackage.stock) {
                showToast('No hay suficientes cupos para esa cantidad de personas.', 'rose');
                return;
            }
            if (!date || date < localIsoDate()) {
                showToast('Selecciona una fecha de viaje futura.', 'rose');
                return;
            }
            const total = passengers * currentSelectedPackage.price;

            document.getElementById('summary-pkg').innerText = currentSelectedPackage.name;
            document.getElementById('summary-date').innerText = date;
            document.getElementById('summary-passengers').innerText = `${passengers} ${passengers === 1 ? 'persona' : 'personas'}`;
            document.getElementById('summary-unit-price').innerText = `S/ ${currentSelectedPackage.price}`;
            document.getElementById('summary-total-price').innerText = `S/ ${total.toLocaleString()}`;

            document.getElementById('booking-step-1').classList.add('hidden');
            document.getElementById('booking-step-2').classList.remove('hidden');
        }

        function backToBookingStep1() {
            document.getElementById('booking-step-2').classList.add('hidden');
            document.getElementById('booking-step-1').classList.remove('hidden');
        }

        let bookingInProgress = false;
        async function confirmBookingFinal() {
            if (bookingInProgress) return;
            if (!currentUser.id) {
                showToast('Tu sesión expiró. Inicia sesión nuevamente.', 'rose');
                return;
            }
            bookingInProgress = true;
            const passengers = parseInt(document.getElementById('book-passengers').value);
            const bookingCode = `RES-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
            try {
                const booking = await window.OrquideasStore.createBooking(currentUser.id, {
                code: bookingCode,
                customer: currentUser.name,
                email: currentUser.email,
                packageId: currentSelectedPackage.id,
                packageName: currentSelectedPackage.name,
                date: document.getElementById('book-date').value,
                passengers,
                price: currentSelectedPackage.price,
                total: passengers * currentSelectedPackage.price
                });
                bookings.unshift(booking);
                document.querySelector('#booking-step-3 .tracking-wider').innerText = booking.code;
                renderBookings();
                document.getElementById('booking-step-2').classList.add('hidden');
                document.getElementById('booking-step-3').classList.remove('hidden');
                showToast(`Reserva ${booking.code} guardada en Supabase.`);
            } catch (error) {
                showToast(error.message || 'No se pudo guardar la reserva.', 'rose');
            } finally {
                bookingInProgress = false;
            }
        }

        function simulateLogin() {
            navigatePage('login.html');
        }

        function simulateRegister() {
            navigatePage('registro.html');
        }

        function escapeHtml(value) {
            return String(value).replace(/[&<>"']/g, character => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            })[character]);
        }

        function formatDate(date) {
            return new Date(`${date}T00:00:00`).toLocaleDateString('es-PE');
        }

        function renderBookings() {
            const adminBody = document.getElementById('admin-bookings-body');
            const clientBody = document.getElementById('client-bookings-body');
            const search = (document.getElementById('admin-booking-search')?.value || '').trim().toLowerCase();
            const selectedStatus = document.getElementById('admin-booking-status')?.value || '';
            const clientSearch = (document.getElementById('client-booking-search')?.value || '').trim().toLowerCase();
            const clientSelectedStatus = document.getElementById('client-booking-status')?.value || '';
            const statusClasses = {
                PENDIENTE: 'bg-amber-500/20 text-amber-300',
                CONFIRMADA: 'bg-emerald-500/20 text-emerald-300',
                CANCELADA: 'bg-rose-500/20 text-rose-300',
                FINALIZADA: 'bg-sky-500/20 text-sky-300'
            };
            const visibleBookings = bookings.filter(booking => {
                const text = `${booking.code} ${booking.customer} ${booking.packageName}`.toLowerCase();
                return text.includes(search) && (!selectedStatus || booking.status === selectedStatus);
            });

            if (adminBody) {
                adminBody.innerHTML = visibleBookings.length ? visibleBookings.map(booking => `
                    <tr class="hover:bg-slate-700/30">
                        <td class="p-3 font-mono font-bold text-brand-400">${escapeHtml(booking.code)}</td>
                        <td class="p-3 font-semibold text-white">${escapeHtml(booking.customer)}</td>
                        <td class="p-3">${escapeHtml(booking.packageName)}</td>
                        <td class="p-3">${formatDate(booking.date)}</td>
                        <td class="p-3">${booking.passengers}</td>
                        <td class="p-3 font-bold text-white">S/ ${Number(booking.total).toLocaleString('es-PE')}</td>
                        <td class="p-3"><span class="${statusClasses[booking.status] || statusClasses.PENDIENTE} font-bold px-2 py-0.5 rounded text-[10px]">${escapeHtml(booking.status)}</span></td>
                        <td class="p-3 text-right whitespace-nowrap">${booking.status === 'PENDIENTE' ? `
                            <button onclick="adminConfirmBooking('${escapeHtml(booking.code)}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded text-[10px]">Confirmar</button>
                            <button onclick="adminRejectBooking('${escapeHtml(booking.code)}')" class="bg-rose-600 hover:bg-rose-500 text-white font-bold px-2.5 py-1 rounded text-[10px]">Cancelar</button>
                        ` : '<span class="text-slate-500 italic text-[10px]">Sin acciones pendientes</span>'}</td>
                    </tr>`).join('') : '<tr><td colspan="8" class="p-6 text-center text-slate-400">No se encontraron reservas.</td></tr>';
            }

            if (clientBody) {
                const ownBookings = bookings.filter(booking => booking.email === currentUser.email);
                const filteredClientBookings = ownBookings.filter(booking => {
                    const text = `${booking.code} ${booking.packageName}`.toLowerCase();
                    return text.includes(clientSearch) && (!clientSelectedStatus || booking.status === clientSelectedStatus);
                });
                document.getElementById('client-active-count').textContent = ownBookings.filter(booking => ['PENDIENTE', 'CONFIRMADA'].includes(booking.status)).length;
                document.getElementById('client-pending-count').textContent = ownBookings.filter(booking => booking.status === 'PENDIENTE').length;
                document.getElementById('client-confirmed-count').textContent = ownBookings.filter(booking => booking.status === 'CONFIRMADA').length;
                document.getElementById('client-finished-count').textContent = ownBookings.filter(booking => booking.status === 'FINALIZADA').length;
                clientBody.innerHTML = filteredClientBookings.length ? filteredClientBookings.map(booking => `
                    <tr>
                        <td class="p-3 font-bold text-brand-700">${escapeHtml(booking.code)}</td>
                        <td class="p-3 font-medium text-slate-800">${escapeHtml(booking.packageName)}</td>
                        <td class="p-3">${formatDate(booking.date)}</td>
                        <td class="p-3">${booking.passengers}</td>
                        <td class="p-3 font-bold">S/ ${Number(booking.total).toLocaleString('es-PE')}</td>
                        <td class="p-3"><span class="${statusClasses[booking.status] || statusClasses.PENDIENTE} font-bold px-2.5 py-0.5 rounded-full text-[10px]">${escapeHtml(booking.status)}</span></td>
                        <td class="p-3 text-right whitespace-nowrap"><div class="flex justify-end items-center gap-3">
                            <button type="button" onclick="showClientBookingDetails('${escapeHtml(booking.code)}')" class="text-brand-700 hover:text-brand-900 font-bold">Ver</button>
                            ${booking.status === 'CONFIRMADA' ? `<button type="button" onclick="downloadClientVoucher('${escapeHtml(booking.code)}')" aria-label="Descargar comprobante" title="Descargar comprobante" class="text-slate-600 hover:text-slate-900"><i class="fa-solid fa-download"></i></button>` : ''}
                            ${booking.status === 'PENDIENTE' ? `<button type="button" onclick="cancelClientBooking('${escapeHtml(booking.code)}')" class="text-rose-600 hover:text-rose-800 font-bold">Cancelar</button>` : ''}
                        </div></td>
                    </tr>`).join('') : '<tr><td colspan="7" class="p-6 text-center text-slate-500">Aún no tienes reservas.</td></tr>';
            }
        }

        function showClientBookingDetails(code) {
            const booking = bookings.find(item => item.code === code && item.email === currentUser.email);
            if (!booking) return;
            document.getElementById('client-detail-code').textContent = booking.code;
            document.getElementById('client-detail-package').textContent = booking.packageName;
            document.getElementById('client-detail-date').textContent = formatDate(booking.date);
            document.getElementById('client-detail-passengers').textContent = `${booking.passengers} personas`;
            document.getElementById('client-detail-total').textContent = `S/ ${Number(booking.total).toLocaleString('es-PE')}`;
            document.getElementById('client-detail-status').textContent = booking.status;
            document.getElementById('client-detail-actions').innerHTML = booking.status === 'CONFIRMADA'
                ? `<button type="button" onclick="downloadClientVoucher('${escapeHtml(booking.code)}')" class="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-lg"><i class="fa-solid fa-download mr-2"></i>Descargar comprobante</button>`
                : '';
            openModal('modal-client-booking');
        }

        function downloadClientVoucher(code) {
            const booking = bookings.find(item => item.code === code && item.email === currentUser.email && item.status === 'CONFIRMADA');
            if (!booking) return;
            const voucher = [
                'ORQUIDEAS TOUR PERU - COMPROBANTE DE RESERVA',
                `Codigo: ${booking.code}`,
                `Cliente: ${booking.customer}`,
                `Paquete: ${booking.packageName}`,
                `Fecha del viaje: ${formatDate(booking.date)}`,
                `Pasajeros: ${booking.passengers}`,
                `Total: S/ ${Number(booking.total).toLocaleString('es-PE')}`,
                `Estado: ${booking.status}`
            ].join('\n');
            const url = URL.createObjectURL(new Blob([voucher], { type: 'text/plain;charset=utf-8' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `comprobante-${booking.code.toLowerCase()}.txt`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        async function cancelClientBooking(code) {
            if (!confirm(`¿Cancelar la reserva ${code}?`)) return;
            const booking = bookings.find(item => item.code === code && item.email === currentUser.email);
            if (!booking) return;
            try {
                await window.OrquideasStore.cancelOwnBooking(booking.id);
                bookings = bookings.map(item => item.id === booking.id ? { ...item, status: 'CANCELADA' } : item);
                renderBookings();
                showToast(`La reserva ${code} fue cancelada.`);
            } catch (error) {
                showToast(error.message || 'No se pudo cancelar la reserva.', 'rose');
            }
        }

        function activePromotion(packageId) {
            const today = new Date().toISOString().slice(0, 10);
            return promotions.find(promotion => promotion.packageId === packageId && promotion.active && promotion.startsOn <= today && promotion.endsOn >= today);
        }

        function packagePrice(packageItem) {
            const promotion = activePromotion(packageItem.id);
            return promotion ? Math.round(packageItem.price * (1 - promotion.discount / 100) * 100) / 100 : Number(packageItem.price);
        }

        function packageImageUrl(value) {
            if (/^data:image\/(png|jpeg|webp);base64,/i.test(value || '')) return value;
            try {
                const url = new URL(value);
                return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
            } catch {
                return '';
            }
        }

        function renderPublicPackages() {
            const catalog = document.getElementById('package-catalog');
            if (!catalog) return;
            const published = packages.filter(packageItem => packageItem.active);
            catalog.innerHTML = published.length ? published.map(packageItem => {
                const promotion = activePromotion(packageItem.id);
                const price = packagePrice(packageItem);
                const image = packageImageUrl(packageItem.image) || 'https://images.unsplash.com/photo-1526392060635-9d6019884377?q=80&w=800&auto=format&fit=crop';
                return `<article class="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
                    <div class="relative"><img src="${escapeHtml(image)}" alt="${escapeHtml(`${packageItem.name} - ${packageItem.destination}`)}" width="600" height="400" loading="lazy" decoding="async" class="w-full h-52 object-cover">${promotion ? `<span class="absolute top-3 left-3 bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full">${escapeHtml(promotion.title)} · -${promotion.discount}%</span>` : ''}<span class="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">${Number(packageItem.stock)} cupos</span></div>
                    <div class="p-5 flex flex-1 flex-col"><div class="flex justify-between gap-3 text-xs text-slate-500"><span><i class="fa-solid fa-clock text-brand-600 mr-1"></i>${escapeHtml(packageItem.duration)}</span><span><i class="fa-solid fa-location-dot text-brand-600 mr-1"></i>${escapeHtml(packageItem.destination)}</span></div><h3 class="text-lg font-bold text-slate-900 mt-3">${escapeHtml(packageItem.name)}</h3><p class="text-sm text-slate-600 mt-2 flex-1">${escapeHtml(packageItem.description)}</p><div class="flex items-end justify-between gap-3 border-t border-slate-100 mt-4 pt-4"><div><span class="text-xs text-slate-400 block">Precio por persona</span>${promotion ? `<span class="text-xs text-slate-400 line-through">S/ ${Number(packageItem.price).toLocaleString('es-PE')}</span>` : ''}<span class="block text-2xl font-extrabold text-brand-700">S/ ${price.toLocaleString('es-PE')}</span></div><button type="button" onclick="openPublicPackageDetails('${escapeHtml(packageItem.id)}')" class="text-brand-700 font-bold text-sm py-2">Detalles</button></div><button type="button" onclick="bookPublicPackage('${escapeHtml(packageItem.id)}')" class="w-full mt-4 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-lg"><i class="fa-solid fa-ticket mr-2"></i>Reservar</button></div>
                </article>`;
            }).join('') : '<p class="col-span-full py-10 text-center text-slate-500">No hay paquetes publicados en este momento.</p>';
            applyPackageFilter();
        }

        function bookPublicPackage(packageId) {
            const packageItem = packages.find(item => item.id === packageId && item.active);
            if (packageItem) selectPackageForBooking(packageItem.name, packagePrice(packageItem), Number(packageItem.stock), packageItem.id);
        }

        function openPublicPackageDetails(packageId) {
            const packageItem = packages.find(item => item.id === packageId && item.active);
            if (!packageItem) return;
            const image = packageImageUrl(packageItem.image) || 'https://images.unsplash.com/photo-1526392060635-9d6019884377?q=80&w=800&auto=format&fit=crop';
            openPackageDetail(packageItem.name, packageItem.destination, packageItem.duration, packagePrice(packageItem), packageItem.stock, image);
            renderPackageServices('detail-includes', packageItem.includes, 'fa-circle-check', 'text-brand-600');
            renderPackageServices('detail-excludes', packageItem.excludes, 'fa-circle-xmark', 'text-rose-500');
        }

        function renderPackageServices(elementId, services, icon, colorClass) {
            const container = document.getElementById(elementId);
            if (!container) return;
            container.innerHTML = services.length
                ? services.map(service => `<div class="flex items-start gap-2"><i class="fa-solid ${icon} ${colorClass} mt-0.5"></i><span>${escapeHtml(service)}</span></div>`).join('')
                : '<p class="text-slate-400">No especificado.</p>';
        }

        function resetPackageForm() {
            const form = document.getElementById('admin-package-form');
            if (!form) return;
            form.reset();
            form.elements.packageId.value = '';
            form.elements.active.checked = true;
            pendingPackageImage = '';
            const preview = document.getElementById('admin-package-image-preview');
            const placeholder = document.getElementById('admin-package-image-placeholder');
            preview?.classList.add('hidden');
            placeholder?.classList.remove('hidden');
        }

        function handlePackageImageUpload(input) {
            const file = input.files?.[0];
            if (!file) return;
            const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!supportedTypes.includes(file.type) || file.size > 1.5 * 1024 * 1024) {
                input.value = '';
                showToast('Sube una foto JPG, PNG o WEBP de máximo 1.5 MB.', 'rose');
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                pendingPackageImage = String(reader.result);
                const preview = document.getElementById('admin-package-image-preview');
                const placeholder = document.getElementById('admin-package-image-placeholder');
                preview.src = pendingPackageImage;
                preview.classList.remove('hidden');
                placeholder.classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }

        async function savePackage(form) {
            const packageId = form.elements.packageId.value || '';
            const existing = packages.find(item => item.id === packageId);
            if (!pendingPackageImage && !existing?.image) {
                showToast('Sube una foto del paquete antes de publicarlo.', 'rose');
                return;
            }
            const packageInput = {
                id: packageId,
                name: form.elements.name.value.trim(),
                destination: form.elements.destination.value.trim(),
                duration: form.elements.duration.value.trim(),
                price: Number(form.elements.price.value),
                stock: Number(form.elements.stock.value),
                image: pendingPackageImage || existing?.image || '',
                imagePath: existing?.imagePath || null,
                imageUrl: existing?.imageUrl || null,
                description: form.elements.description.value.trim(),
                includes: form.elements.includes.value.split('\n').map(service => service.trim()).filter(Boolean),
                excludes: form.elements.excludes.value.split('\n').map(service => service.trim()).filter(Boolean),
                active: form.elements.active.checked
            };
            try {
                const packageItem = await window.OrquideasStore.savePackage(currentUser.id, packageInput, pendingPackageImage);
                packages = existing ? packages.map(item => item.id === packageId ? packageItem : item) : [packageItem, ...packages];
                resetPackageForm();
                renderPackages();
                renderPromotions();
                renderPublicPackages();
                showToast('El paquete se guardó en Supabase.');
            } catch (error) {
                showToast(error.message || 'No se pudo guardar el paquete en Supabase.', 'rose');
            }
        }

        function editPackage(packageId) {
            const packageItem = packages.find(item => item.id === packageId);
            const form = document.getElementById('admin-package-form');
            if (!packageItem || !form) return;
            Object.entries(packageItem).forEach(([key, value]) => {
                if (form.elements[key] && !['active', 'image'].includes(key)) {
                    form.elements[key].value = Array.isArray(value) ? value.join('\n') : value;
                }
            });
            form.elements.active.checked = packageItem.active;
            pendingPackageImage = packageImageUrl(packageItem.image);
            const preview = document.getElementById('admin-package-image-preview');
            const placeholder = document.getElementById('admin-package-image-placeholder');
            if (pendingPackageImage) {
                preview.src = pendingPackageImage;
                preview.classList.remove('hidden');
                placeholder.classList.add('hidden');
            }
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        async function deletePackage(packageId) {
            if (!confirm('¿Eliminar este paquete del catálogo?')) return;
            try {
                await window.OrquideasStore.deletePackage(packageId);
                packages = packages.filter(item => item.id !== packageId);
                promotions = promotions.filter(item => item.packageId !== packageId);
                renderPackages();
                renderPromotions();
                renderPublicPackages();
            } catch (error) {
                showToast(error.message || 'No se pudo eliminar el paquete.', 'rose');
            }
        }

        function renderPackages() {
            const table = document.getElementById('admin-packages-body');
            if (table) table.innerHTML = packages.length ? packages.map(packageItem => `
                <tr><td class="p-3"><img src="${escapeHtml(packageImageUrl(packageItem.image) || '../img/logo.png')}" alt="" class="w-16 h-12 rounded-md object-cover bg-slate-700"></td><td class="p-3 font-semibold text-white">${escapeHtml(packageItem.name)}</td><td class="p-3">${escapeHtml(packageItem.destination)}</td><td class="p-3">S/ ${Number(packageItem.price).toLocaleString('es-PE')}</td><td class="p-3">${Number(packageItem.stock)}</td><td class="p-3">${packageItem.active ? 'Publicado' : 'Oculto'}</td><td class="p-3 text-right whitespace-nowrap"><button type="button" onclick="editPackage('${escapeHtml(packageItem.id)}')" class="text-sky-300 font-bold mr-3">Editar</button><button type="button" onclick="deletePackage('${escapeHtml(packageItem.id)}')" class="text-rose-300 font-bold">Eliminar</button></td></tr>`).join('') : '<tr><td colspan="7" class="p-5 text-center text-slate-400">No hay paquetes.</td></tr>';
        }

        async function savePromotion(form) {
            const endsOn = form.elements.endsOn.value;
            const today = new Date().toISOString().slice(0, 10);
            if (endsOn < today) {
                showToast('La promoción debe terminar hoy o en una fecha futura.', 'rose');
                return;
            }
            try {
                const promotion = await window.OrquideasStore.savePromotion(currentUser.id, { packageId: form.elements.packageId.value, title: form.elements.title.value.trim(), discount: Number(form.elements.discount.value), startsOn: today, endsOn, active: true });
                promotions.unshift(promotion);
                form.reset();
                renderPromotions();
                renderPublicPackages();
                showToast('Promoción publicada en Supabase.');
            } catch (error) {
                showToast(error.message || 'No se pudo guardar la promoción.', 'rose');
            }
        }

        async function togglePromotion(promotionId) {
            const promotion = promotions.find(item => item.id === promotionId);
            if (!promotion) return;
            try {
                const updated = await window.OrquideasStore.updatePromotion(promotionId, { is_active: !promotion.active });
                promotions = promotions.map(item => item.id === promotionId ? updated : item);
                renderPromotions();
                renderPublicPackages();
            } catch (error) {
                showToast(error.message || 'No se pudo actualizar la promoción.', 'rose');
            }
        }

        async function deletePromotion(promotionId) {
            try {
                await window.OrquideasStore.deletePromotion(promotionId);
                promotions = promotions.filter(promotion => promotion.id !== promotionId);
                renderPromotions();
                renderPublicPackages();
            } catch (error) {
                showToast(error.message || 'No se pudo eliminar la promoción.', 'rose');
            }
        }

        function renderPromotions() {
            const selector = document.getElementById('promotion-package');
            if (selector) selector.innerHTML = packages.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('');
            const list = document.getElementById('admin-promotions-list');
            if (list) list.innerHTML = promotions.length ? promotions.map(promotion => {
                const packageItem = packages.find(item => item.id === promotion.packageId);
                return `<div class="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><strong class="text-white">${escapeHtml(promotion.title)}</strong><p class="text-xs text-slate-400">${escapeHtml(packageItem?.name || 'Paquete eliminado')} · ${promotion.discount}% · Hasta ${formatDate(promotion.endsOn)}</p></div><div class="flex gap-3"><button type="button" onclick="togglePromotion('${escapeHtml(promotion.id)}')" class="text-sky-300 text-xs font-bold">${promotion.active ? 'Pausar' : 'Activar'}</button><button type="button" onclick="deletePromotion('${escapeHtml(promotion.id)}')" class="text-rose-300 text-xs font-bold">Eliminar</button></div></div>`;
            }).join('') : '<p class="py-4 text-sm text-slate-400">Todavía no hay promociones.</p>';
        }

        function renderAdminSales() {
            const confirmed = bookings.filter(booking => booking.status === 'CONFIRMADA');
            const total = confirmed.reduce((sum, booking) => sum + Number(booking.total), 0);
            const totalElement = document.getElementById('admin-sales-total');
            const body = document.getElementById('admin-sales-body');
            if (totalElement) totalElement.textContent = `S/ ${total.toLocaleString('es-PE')}`;
            if (body) body.innerHTML = confirmed.length ? confirmed.map(booking => `<tr><td class="p-3 font-mono text-brand-300">${escapeHtml(booking.code)}</td><td class="p-3">${escapeHtml(booking.customer)}</td><td class="p-3">${escapeHtml(booking.packageName)}</td><td class="p-3">${formatDate(booking.date)}</td><td class="p-3">${Number(booking.passengers)}</td><td class="p-3 font-bold text-emerald-300">S/ ${Number(booking.total).toLocaleString('es-PE')}</td></tr>`).join('') : '<tr><td colspan="6" class="p-5 text-center text-slate-400">Aún no hay ventas confirmadas.</td></tr>';
        }

        function toggleInvoiceFields() {
            const isInvoice = document.getElementById('invoice-type')?.value === 'FACTURA';
            document.getElementById('invoice-business-name-field')?.classList.toggle('hidden', !isInvoice);
            document.getElementById('invoice-buyer-name-field')?.classList.toggle('hidden', isInvoice);
            const form = document.getElementById('invoice-form');
            if (form) {
                form.elements.businessName.required = isInvoice;
                form.elements.buyerName.required = !isInvoice;
                const documentInput = form.elements.buyerDocument;
                const label = document.getElementById('invoice-document-label');
                documentInput.maxLength = isInvoice ? 11 : 8;
                documentInput.pattern = isInvoice ? '[0-9]{11}' : '[0-9]{8}';
                label.childNodes[0].textContent = isInvoice ? 'RUC de la empresa (11 dígitos)' : 'DNI del cliente (8 dígitos)';
            }
        }

        function setInvoiceLookupMessage(message, isError = false) {
            const target = document.getElementById('invoice-lookup-message');
            if (!target) return;
            target.textContent = message;
            target.className = `sm:col-span-2 text-xs ${isError ? 'text-rose-300' : 'text-emerald-300'}`;
            target.classList.remove('hidden');
        }

        async function lookupInvoiceDocument() {
            const form = document.getElementById('invoice-form');
            const documentNumber = form.elements.buyerDocument.value.trim();
            const isInvoice = form.elements.type.value === 'FACTURA';
            const requiredLength = isInvoice ? 11 : 8;
            if (!new RegExp(`^\\d{${requiredLength}}$`).test(documentNumber)) {
                setInvoiceLookupMessage(`Ingresa un ${isInvoice ? 'RUC de 11' : 'DNI de 8'} dígitos para buscar.`, true);
                form.elements.buyerDocument.focus();
                return;
            }

            const button = form.querySelector('button[onclick="lookupInvoiceDocument()"]');
            button.disabled = true;
            button.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Buscando...';
            setInvoiceLookupMessage('Consultando el registro público...');
            try {
                const endpoint = isInvoice
                    ? `https://api-consulta-peru.onrender.com/api/ruc/${encodeURIComponent(documentNumber)}`
                    : `https://api-consulta-peru.onrender.com/api/dni/${encodeURIComponent(documentNumber)}`;
                const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
                const result = await response.json();
                if (!response.ok || result.success === false || result.detail) {
                    throw new Error(result.detail || result.message || 'No se encontraron datos para ese documento.');
                }
                const data = result.data || result.result || result;
                const personName = [
                    data.nombres || data.names,
                    data.apellido_paterno || data.apellidoPaterno || data.paternal_surname,
                    data.apellido_materno || data.apellidoMaterno || data.maternal_surname
                ].filter(Boolean).join(' ');
                const fullName = data.nombre_completo || data.nombreCompleto || data.full_name || data.fullName || data.name || personName;
                const businessName = data.razon_social || data.razonSocial || data.nombre_o_razon_social || data.nombre || data.name;
                const name = isInvoice ? businessName : fullName;
                if (!name) throw new Error('La consulta respondió, pero no incluyó el nombre esperado.');
                if (isInvoice) form.elements.businessName.value = name;
                else form.elements.buyerName.value = name;
                setInvoiceLookupMessage(`${isInvoice ? 'Empresa encontrada' : 'Persona encontrada'}: ${name}`);
            } catch (error) {
                setInvoiceLookupMessage(error.message || 'No se pudo consultar el servicio de documentos. Intenta nuevamente.', true);
            } finally {
                button.disabled = false;
                button.innerHTML = '<i class="fa-solid fa-magnifying-glass mr-2"></i>Buscar datos';
            }
        }

        async function generateInvoice(form) {
            const booking = bookings.find(item => item.code === form.elements.bookingCode.value && item.status === 'CONFIRMADA');
            if (!booking) {
                showToast('Selecciona una reserva confirmada para facturar.', 'rose');
                return;
            }
            if (invoices.some(invoice => invoice.bookingCode === booking.code)) {
                showToast('Esta reserva ya tiene un comprobante emitido.', 'rose');
                return;
            }
            const type = form.elements.type.value;
            const buyerDocument = form.elements.buyerDocument.value.trim();
            const ruc = type === 'FACTURA' ? buyerDocument : '';
            if (type === 'FACTURA' && !/^\d{11}$/.test(ruc)) {
                showToast('El RUC debe tener 11 dígitos.', 'rose');
                return;
            }
            if (type === 'BOLETA' && !/^\d{8}$/.test(buyerDocument)) {
                showToast('Ingresa un DNI válido de 8 dígitos.', 'rose');
                return;
            }
            const prefix = type === 'FACTURA' ? 'F001' : 'B001';
            const nextNumber = invoices.filter(invoice => invoice.type === type).length + 1;
            const total = Number(booking.total);
            const invoiceNumber = `${prefix}-${String(nextNumber).padStart(6, '0')}`;
            const invoice = {
                id: invoiceNumber,
                bookingId: booking.id,
                userId: booking.userId,
                type,
                bookingCode: booking.code,
                customer: form.elements.buyerName.value.trim() || booking.customer,
                email: booking.email,
                document: buyerDocument,
                businessName: type === 'FACTURA' ? form.elements.businessName.value.trim() : '',
                ruc: type === 'FACTURA' ? ruc : '',
                packageName: booking.packageName,
                date: new Date().toISOString().slice(0, 10),
                subtotal: Math.round(total / 1.18 * 100) / 100,
                tax: Math.round((total - total / 1.18) * 100) / 100,
                total
            };
            try {
                const savedInvoice = await window.OrquideasStore.createReceipt(currentUser.id, invoice);
                invoices.unshift(savedInvoice);
                form.reset();
                toggleInvoiceFields();
                renderInvoices();
                showToast(`${type === 'FACTURA' ? 'Factura' : 'Boleta'} ${savedInvoice.id} guardada en Supabase.`);
            } catch (error) {
                showToast(error.message || 'No se pudo emitir el comprobante.', 'rose');
            }
        }

        function renderInvoices() {
            const select = document.getElementById('invoice-booking');
            const billableBookings = bookings.filter(booking => booking.status === 'CONFIRMADA' && !invoices.some(invoice => invoice.bookingCode === booking.code));
            if (select) select.innerHTML = billableBookings.length ? billableBookings.map(booking => `<option value="${escapeHtml(booking.code)}">${escapeHtml(booking.code)} · ${escapeHtml(booking.customer)} · S/ ${Number(booking.total).toLocaleString('es-PE')}</option>`).join('') : '<option value="">No hay reservas confirmadas pendientes de facturar</option>';
            const body = document.getElementById('admin-invoices-body') || document.getElementById('invoice-list-body');
            const visibleInvoices = invoices;
            if (body) body.innerHTML = visibleInvoices.length ? visibleInvoices.map(invoice => `<tr><td class="p-3 font-mono text-brand-300">${escapeHtml(invoice.id)}</td><td class="p-3">${escapeHtml(invoice.type)}</td><td class="p-3">${escapeHtml(invoice.businessName || invoice.customer)}</td><td class="p-3">${escapeHtml(invoice.bookingCode)}</td><td class="p-3">${formatDate(invoice.date)}</td><td class="p-3 font-bold">S/ ${Number(invoice.total).toLocaleString('es-PE')}</td><td class="p-3 text-right"><button type="button" onclick="downloadInvoice('${escapeHtml(invoice.id)}')" class="text-brand-300 hover:text-white font-bold"><i class="fa-solid fa-download mr-1"></i>Descargar</button></td></tr>`).join('') : '<tr><td colspan="7" class="p-5 text-center text-slate-400">Todavía no hay comprobantes emitidos.</td></tr>';
        }

        function renderPassages() {
            const body = document.getElementById('passages-list');
            if (!body) return;
            const confirmed = bookings.filter(booking => booking.email === currentUser.email && booking.status === 'CONFIRMADA');
            body.innerHTML = confirmed.length ? confirmed.map(booking => `<article class="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><span class="text-xs font-bold text-brand-700">PASAJES · ${escapeHtml(booking.code)}</span><h2 class="text-lg font-extrabold text-slate-900 mt-1">${escapeHtml(booking.packageName)}</h2><p class="text-sm text-slate-600 mt-1">${formatDate(booking.date)} · ${Number(booking.passengers)} pasajeros · S/ ${Number(booking.total).toLocaleString('es-PE')}</p></div><button type="button" onclick="downloadPassage('${escapeHtml(booking.code)}')" class="bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm px-4 py-2.5 rounded-lg"><i class="fa-solid fa-download mr-2"></i>Descargar pasaje</button></article>`).join('') : '<div class="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500">No tienes pasajes confirmados todavía.</div>';
        }

        function downloadPassage(code) {
            const booking = bookings.find(item => item.code === code && item.email === currentUser.email && item.status === 'CONFIRMADA');
            if (!booking) return;
            const ticket = ['ORQUIDEAS TOUR PERU - PASAJE TURISTICO', `Codigo de reserva: ${booking.code}`, `Titular: ${booking.customer}`, `Paquete: ${booking.packageName}`, `Fecha del viaje: ${formatDate(booking.date)}`, `Pasajeros: ${booking.passengers}`, `Estado: ${booking.status}`].join('\n');
            const url = URL.createObjectURL(new Blob([ticket], { type: 'text/plain;charset=utf-8' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `pasaje-${booking.code.toLowerCase()}.txt`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        function downloadInvoice(invoiceId) {
            const invoice = invoices.find(item => item.id === invoiceId);
            if (!invoice) return;
            const invoiceHtml = `<!doctype html><html lang="es"><meta charset="utf-8"><title>${escapeHtml(invoice.type)} ${escapeHtml(invoice.id)}</title><style>body{font:16px Arial,sans-serif;color:#17211c;max-width:760px;margin:40px auto;padding:32px;border:1px solid #d8e2dc}header{display:flex;justify-content:space-between;border-bottom:2px solid #16834a;padding-bottom:18px}h1{color:#166534}table{width:100%;border-collapse:collapse;margin-top:30px}td,th{text-align:left;padding:12px;border-bottom:1px solid #dce5df}.total{text-align:right;font-size:22px;font-weight:bold}.notice{margin-top:36px;font-size:12px;color:#64748b}</style><header><div><h1>ORQUÍDEA TOUR PERÚ</h1><p>orquideatourperu@hotmail.com · +51 989 851 245</p></div><div><h2>${escapeHtml(invoice.type)}</h2><strong>${escapeHtml(invoice.id)}</strong></div></header><p>Cliente: ${escapeHtml(invoice.businessName || invoice.customer)}</p>${invoice.ruc ? `<p>RUC: ${escapeHtml(invoice.ruc)}</p>` : ''}<p>Reserva: ${escapeHtml(invoice.bookingCode)} · Fecha: ${formatDate(invoice.date)}</p><table><thead><tr><th>Descripción</th><th>Importe</th></tr></thead><tbody><tr><td>${escapeHtml(invoice.packageName)}</td><td>S/ ${Number(invoice.subtotal).toFixed(2)}</td></tr><tr><td>IGV incluido</td><td>S/ ${Number(invoice.tax).toFixed(2)}</td></tr></tbody></table><p class="total">Total: S/ ${Number(invoice.total).toLocaleString('es-PE')}</p><p class="notice">Comprobante interno de referencia. No es un documento tributario electrónico emitido por SUNAT.</p></html>`;
            const url = URL.createObjectURL(new Blob([invoiceHtml], { type: 'text/html;charset=utf-8' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `${invoice.id.toLowerCase()}.html`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        function renderAdminData() {
            const clientsBody = document.getElementById('admin-clients-body');
            if (clientsBody) {
                const clients = bookings.reduce((groups, booking) => {
                    const client = groups[booking.email] || { name: booking.customer, email: booking.email, count: 0, total: 0 };
                    client.count += 1;
                    client.total += Number(booking.total);
                    groups[booking.email] = client;
                    return groups;
                }, {});
                const rows = Object.values(clients);
                clientsBody.innerHTML = rows.length ? rows.map(client => `
                    <tr><td class="p-3 font-semibold text-white">${escapeHtml(client.name)}</td><td class="p-3">${escapeHtml(client.email)}</td><td class="p-3">${client.count}</td><td class="p-3 font-bold">S/ ${client.total.toLocaleString('es-PE')}</td></tr>
                `).join('') : '<tr><td colspan="4" class="p-6 text-center text-slate-400">Aún no hay clientes registrados.</td></tr>';
            }

            const summary = document.getElementById('report-summary');
            if (summary) {
                const confirmed = bookings.filter(booking => booking.status === 'CONFIRMADA').length;
                const pending = bookings.filter(booking => booking.status === 'PENDIENTE').length;
                const canceled = bookings.filter(booking => booking.status === 'CANCELADA').length;
                const revenue = bookings.filter(booking => booking.status === 'CONFIRMADA').reduce((total, booking) => total + Number(booking.total), 0);
                summary.innerHTML = [
                    ['Reservas', bookings.length], ['Pendientes', pending], ['Confirmadas', confirmed], ['Ventas confirmadas', `S/ ${revenue.toLocaleString('es-PE')}`], ['Canceladas', canceled]
                ].map(([label, value]) => `<div class="bg-slate-900 border border-slate-700 rounded-xl p-3"><span class="block text-xs text-slate-400">${label}</span><strong class="text-white">${value}</strong></div>`).join('');
            }
            renderAdminDashboard();
            renderAdminSales();
            renderInvoices();
            renderPackages();
            renderPromotions();
            renderAvailability();
            renderHistory();
            renderComplaints();
            renderAdminAlerts();
            const today = document.getElementById('admin-today');
            if (today) today.textContent = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        // Disponibilidad real por paquete (cupos libres + pasajeros reservados)
        function renderAvailability() {
            const list = document.getElementById('admin-availability-list');
            if (!list) return;
            if (!packages.length) {
                list.innerHTML = '<p class="text-sm text-slate-400">No hay paquetes registrados.</p>';
                return;
            }
            list.innerHTML = packages.map(packageItem => {
                const reserved = bookings
                    .filter(booking => booking.packageId === packageItem.id && ['PENDIENTE', 'CONFIRMADA'].includes(booking.status))
                    .reduce((total, booking) => total + Number(booking.passengers), 0);
                const free = Number(packageItem.stock);
                const capacity = reserved + free;
                const percent = capacity ? Math.round((reserved / capacity) * 100) : 0;
                const tone = free === 0 ? 'rose' : free <= 5 ? 'amber' : 'emerald';
                const note = free === 0 ? ' (agotado)' : free <= 5 ? ' (crítico)' : '';
                return `<div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <div class="flex flex-wrap justify-between items-center gap-2 text-xs mb-2"><span class="font-bold text-white">${escapeHtml(packageItem.name)}${packageItem.active ? '' : ' <span class="text-slate-500">(oculto)</span>'}</span><span class="text-${tone}-400 font-mono font-bold">${reserved} / ${capacity} cupos ocupados (${percent}%)</span></div>
                    <div class="w-full bg-slate-800 h-3 rounded-full overflow-hidden"><div class="bg-${tone}-500 h-full rounded-full" style="width:${percent}%"></div></div>
                    <div class="flex justify-between gap-2 text-[11px] text-slate-500 mt-2"><span>Reservados (pendientes + confirmados): ${reserved}</span><span class="text-${tone}-400 font-bold">${free} cupos libres${note}</span></div>
                </div>`;
            }).join('');
        }

        // Historial construido con movimientos reales
        function renderHistory() {
            const body = document.getElementById('admin-history-body');
            if (!body) return;
            const events = [
                ...bookings.map(booking => ({ date: booking.createdAt || booking.date, who: booking.customer || booking.email, action: `Reserva ${booking.status.toLowerCase()}`, module: 'Reservas', ref: booking.code })),
                ...invoices.map(invoice => ({ date: invoice.date, who: 'Administrador', action: `Emitió ${invoice.type.toLowerCase()}`, module: 'Comprobantes', ref: invoice.id })),
                ...complaints.map(item => ({ date: item.createdAt, who: item.name, action: `Registró ${item.kind} (${item.status.replace('_', ' ')})`, module: 'Reclamaciones', ref: item.code }))
            ].filter(event => event.date).sort((left, right) => String(right.date).localeCompare(String(left.date))).slice(0, 50);
            body.innerHTML = events.length
                ? events.map(event => `<tr><td class="p-3 text-white">${escapeHtml(event.who)}</td><td class="p-3">${escapeHtml(event.action)}</td><td class="p-3">${escapeHtml(event.module)}</td><td class="p-3 font-mono text-brand-400">${escapeHtml(event.ref)}</td><td class="p-3 text-slate-400">${escapeHtml(new Date(event.date).toLocaleString('es-PE'))}</td></tr>`).join('')
                : '<tr><td colspan="5" class="p-6 text-center text-slate-400">Aún no hay movimientos.</td></tr>';
        }

        // Alertas del dashboard: lo que el dueño debe atender
        function renderAdminAlerts() {
            const container = document.getElementById('admin-alerts');
            const pendingBookings = bookings.filter(booking => booking.status === 'PENDIENTE').length;
            const pendingComplaints = complaints.filter(item => item.status !== 'respondido').length;
            const soldOut = packages.filter(packageItem => packageItem.active && Number(packageItem.stock) === 0).length;
            const badge = document.getElementById('admin-complaints-badge');
            if (badge) {
                badge.textContent = pendingComplaints;
                badge.classList.toggle('hidden', !pendingComplaints);
            }
            if (!container) return;
            const alerts = [];
            if (pendingBookings) alerts.push(['amber', 'fa-hourglass-half', `Tienes ${pendingBookings} reserva(s) pendiente(s) de confirmar.`, 'reservas', 'Revisar reservas']);
            if (pendingComplaints) alerts.push(['rose', 'fa-book', `Hay ${pendingComplaints} reclamo(s) sin responder. Plazo legal: 15 días hábiles.`, 'reclamaciones', 'Responder']);
            if (soldOut) alerts.push(['sky', 'fa-ban', `${soldOut} paquete(s) publicado(s) sin cupos disponibles.`, 'paquetes', 'Ver paquetes']);
            container.innerHTML = alerts.map(([tone, icon, text, tab, label]) => `<div class="flex flex-wrap items-center gap-3 rounded-xl border border-${tone}-500/40 bg-${tone}-500/10 px-4 py-3 text-sm text-${tone}-200"><i class="fa-solid ${icon}" aria-hidden="true"></i><span class="flex-1 min-w-[200px]">${text}</span><button type="button" onclick="switchAdminTab('${tab}')" class="font-bold underline underline-offset-2">${label}</button></div>`).join('');
        }

        // Libro de reclamaciones (admin)
        const COMPLAINT_STATUS = {
            pendiente: ['Pendiente', 'bg-rose-500/20 text-rose-300'],
            en_proceso: ['En proceso', 'bg-amber-500/20 text-amber-300'],
            respondido: ['Respondido', 'bg-emerald-500/20 text-emerald-300']
        };

        function businessDaysSince(dateValue) {
            const day = new Date(dateValue);
            const end = new Date();
            let days = 0;
            day.setDate(day.getDate() + 1);
            while (day <= end) {
                if (![0, 6].includes(day.getDay())) days += 1;
                day.setDate(day.getDate() + 1);
            }
            return days;
        }

        function renderComplaints() {
            const list = document.getElementById('admin-complaints-list');
            if (!list) return;
            const filter = document.getElementById('admin-complaint-filter')?.value || '';
            const rows = complaints.filter(item => !filter || item.status === filter);
            if (!rows.length) {
                list.innerHTML = '<p class="py-8 text-center text-sm text-slate-400">No hay reclamos registrados.</p>';
                return;
            }
            list.innerHTML = rows.map(item => {
                const [statusLabel, statusClass] = COMPLAINT_STATUS[item.status] || COMPLAINT_STATUS.pendiente;
                const elapsed = businessDaysSince(item.createdAt);
                const late = item.status !== 'respondido' && elapsed > 15;
                const id = escapeHtml(item.id);
                const mailSubject = encodeURIComponent(`Respuesta a su ${item.kind} ${item.code}`);
                return `<details class="bg-slate-900 border ${late ? 'border-rose-600' : 'border-slate-700'} rounded-xl">
                    <summary class="cursor-pointer list-none p-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                        <span class="font-mono font-bold text-brand-400">${escapeHtml(item.code)}</span>
                        <span class="uppercase font-bold ${item.kind === 'reclamo' ? 'text-amber-300' : 'text-sky-300'}">${escapeHtml(item.kind)}</span>
                        <span class="text-white font-semibold flex-1 min-w-[140px]">${escapeHtml(item.name)}</span>
                        <span class="text-slate-400">${escapeHtml(new Date(item.createdAt).toLocaleDateString('es-PE'))} · ${elapsed} día(s) hábil(es)${late ? ' <b class="text-rose-400">VENCIDO</b>' : ''}</span>
                        <span class="px-2 py-0.5 rounded font-bold text-[10px] ${statusClass}">${statusLabel}</span>
                    </summary>
                    <div class="border-t border-slate-800 p-4 grid gap-4 text-xs text-slate-300 lg:grid-cols-2">
                        <dl class="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5">
                            <dt class="text-slate-500">Documento</dt><dd>${escapeHtml(item.documentType)} ${escapeHtml(item.documentNumber)}</dd>
                            <dt class="text-slate-500">Correo</dt><dd class="break-all"><a class="underline" href="mailto:${escapeHtml(item.email)}?subject=${mailSubject}">${escapeHtml(item.email)}</a></dd>
                            <dt class="text-slate-500">Teléfono</dt><dd>${escapeHtml(item.phone || '—')}</dd>
                            <dt class="text-slate-500">Domicilio</dt><dd>${escapeHtml(item.address)}</dd>
                            ${item.isMinor ? `<dt class="text-slate-500">Apoderado</dt><dd>${escapeHtml(item.guardian)}</dd>` : ''}
                            <dt class="text-slate-500">${item.goodType === 'producto' ? 'Producto' : 'Servicio'}</dt><dd>${escapeHtml(item.goodDescription)}</dd>
                            <dt class="text-slate-500">Monto</dt><dd>${item.amount === null ? '—' : 'S/ ' + item.amount.toLocaleString('es-PE')}</dd>
                        </dl>
                        <div class="space-y-3">
                            <div><p class="text-slate-500 mb-1">Detalle</p><p class="whitespace-pre-line text-white">${escapeHtml(item.detail)}</p></div>
                            <div><p class="text-slate-500 mb-1">Pedido del consumidor</p><p class="whitespace-pre-line text-white">${escapeHtml(item.request)}</p></div>
                        </div>
                        <form class="lg:col-span-2 space-y-2" onsubmit="event.preventDefault(); respondComplaint('${id}', this)">
                            <label class="block text-slate-400 font-bold" for="response-${id}">Respuesta del proveedor</label>
                            <textarea id="response-${id}" name="response" rows="3" maxlength="3000" required class="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500">${escapeHtml(item.response)}</textarea>
                            <div class="flex flex-wrap gap-2 justify-end">
                                ${item.status === 'pendiente' ? `<button type="button" onclick="setComplaintStatus('${id}', 'en_proceso')" class="bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-2 rounded-lg">Marcar en proceso</button>` : ''}
                                <button type="submit" class="bg-brand-600 hover:bg-brand-700 text-white font-bold px-3 py-2 rounded-lg">${item.response ? 'Actualizar respuesta' : 'Guardar respuesta'}</button>
                            </div>
                            ${item.respondedAt ? `<p class="text-right text-slate-500">Respondido el ${escapeHtml(new Date(item.respondedAt).toLocaleString('es-PE'))}. Envía también la respuesta al correo del consumidor.</p>` : ''}
                        </form>
                    </div>
                </details>`;
            }).join('');
        }

        async function setComplaintStatus(complaintId, status) {
            try {
                const updated = await window.OrquideasStore.updateComplaint(complaintId, { status });
                complaints = complaints.map(item => item.id === complaintId ? updated : item);
                renderComplaints();
                renderAdminAlerts();
                showToast('Estado del reclamo actualizado.');
            } catch (error) {
                showToast(error.message || 'No se pudo actualizar el reclamo.', 'rose');
            }
        }

        async function respondComplaint(complaintId, form) {
            const response = form.elements.response.value.trim();
            if (response.length < 5) {
                showToast('Escribe una respuesta más completa.', 'rose');
                return;
            }
            try {
                const updated = await window.OrquideasStore.updateComplaint(complaintId, { response });
                complaints = complaints.map(item => item.id === complaintId ? updated : item);
                renderComplaints();
                renderAdminAlerts();
                renderHistory();
                showToast('Respuesta guardada. Recuerda enviarla al correo del consumidor.');
            } catch (error) {
                showToast(error.message || 'No se pudo guardar la respuesta.', 'rose');
            }
        }

        function renderAdminDashboard() {
            const yearSelect = document.getElementById('admin-dashboard-year');
            const selectedYear = yearSelect?.value || '';
            if (yearSelect) {
                const years = [...new Set(bookings.map(booking => booking.date.slice(0, 4)))].sort((left, right) => right.localeCompare(left));
                yearSelect.innerHTML = '<option value="">Todos</option>' + years.map(year => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join('');
                yearSelect.value = years.includes(selectedYear) ? selectedYear : '';
            }

            const dashboardBookings = selectedYear
                ? bookings.filter(booking => booking.date.startsWith(`${selectedYear}-`))
                : bookings;
            const confirmed = dashboardBookings.filter(booking => booking.status === 'CONFIRMADA');
            const metricValues = {
                'admin-metric-clients': new Set(dashboardBookings.map(booking => booking.email)).size,
                'admin-metric-packages': new Set(dashboardBookings.map(booking => booking.packageName)).size,
                'admin-metric-pending': dashboardBookings.filter(booking => booking.status === 'PENDIENTE').length,
                'admin-metric-revenue': `S/ ${confirmed.reduce((total, booking) => total + Number(booking.total), 0).toLocaleString('es-PE')}`,
                'admin-metric-bookings': dashboardBookings.length
            };
            Object.entries(metricValues).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            });

            const recentBody = document.getElementById('admin-recent-bookings');
            if (recentBody) {
                const statusClasses = {
                    PENDIENTE: 'text-amber-300',
                    CONFIRMADA: 'text-emerald-300',
                    CANCELADA: 'text-rose-300',
                    FINALIZADA: 'text-sky-300'
                };
                recentBody.innerHTML = dashboardBookings.length ? dashboardBookings.slice(0, 5).map(booking => `
                    <tr>
                        <td class="p-3"><button type="button" onclick="openAdminBooking('${escapeHtml(booking.code)}')" class="font-mono font-bold text-brand-400 hover:text-white">${escapeHtml(booking.code)}</button></td>
                        <td class="p-3 text-white">${escapeHtml(booking.customer)}</td>
                        <td class="p-3">${escapeHtml(booking.packageName)}</td>
                        <td class="p-3">${formatDate(booking.date)}</td>
                        <td class="p-3 font-bold ${statusClasses[booking.status] || ''}">${escapeHtml(booking.status)}</td>
                    </tr>`).join('') : '<tr><td colspan="5" class="p-5 text-center text-slate-400">No hay reservas para este período.</td></tr>';
            }

            if (monthlyBookingsChart && bookingStatusChart) {
                const monthlyCounts = Array(12).fill(0);
                dashboardBookings.forEach(booking => {
                    const month = Number(booking.date.slice(5, 7)) - 1;
                    if (month >= 0 && month < 12) monthlyCounts[month] += 1;
                });
                monthlyBookingsChart.data.datasets[0].data = monthlyCounts;
                monthlyBookingsChart.update();

                const statuses = ['CONFIRMADA', 'PENDIENTE', 'CANCELADA', 'FINALIZADA'];
                bookingStatusChart.data.datasets[0].data = statuses.map(status => dashboardBookings.filter(booking => booking.status === status).length);
                bookingStatusChart.update();
            }
        }

        function openAdminBooking(code) {
            switchAdminTab('reservas');
            document.getElementById('admin-booking-search').value = code;
            renderBookings();
        }

        function exportBookingsCsv() {
            const quote = value => `"${String(value).replace(/"/g, '""')}"`;
            const rows = [['Código', 'Cliente', 'Correo', 'Paquete', 'Fecha', 'Pasajeros', 'Total', 'Estado'], ...bookings.map(booking => [booking.code, booking.customer, booking.email, booking.packageName, booking.date, booking.passengers, booking.total, booking.status])];
            const csv = '\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n');
            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
            link.download = 'reservas-orquideas-tour.csv';
            link.click();
            URL.revokeObjectURL(link.href);
        }

        async function setBookingStatus(code, status) {
            const booking = bookings.find(item => item.code === code);
            if (!booking) return;
            try {
                const updated = await window.OrquideasStore.updateBookingStatus(booking.id, status);
                bookings = bookings.map(item => item.id === booking.id ? updated : item);
                renderBookings();
                renderAdminData();
                showToast(`La reserva ${code} ahora está ${status.toLowerCase()}.`);
            } catch (error) {
                showToast(error.message || 'No se pudo actualizar la reserva.', 'rose');
            }
        }

        function adminConfirmBooking(code) {
            setBookingStatus(code, 'CONFIRMADA');
        }

        function adminRejectBooking(code) {
            setBookingStatus(code, 'CANCELADA');
        }

        // Cambio de Pestañas en Admin Panel
        function switchAdminTab(tabName) {
            ['dash', 'reservas', 'ventas', 'clientes', 'paquetes', 'promociones', 'disponibilidad', 'reportes', 'facturacion', 'historial', 'reclamaciones'].forEach(tab => {
                document.getElementById(`admin-tab-${tab}`)?.classList.toggle('hidden', tab !== tabName);
            });
            document.querySelectorAll('[data-admin-tab]').forEach(button => {
                const active = button.dataset.adminTab === tabName;
                button.classList.toggle('bg-brand-600', active);
                button.classList.toggle('text-white', active);
                button.classList.toggle('font-semibold', active);
                button.classList.toggle('text-slate-400', !active);
                if (active) button.setAttribute('aria-current', 'page');
                else button.removeAttribute('aria-current');
            });
            const mobileNav = document.getElementById('admin-mobile-nav');
            if (mobileNav && mobileNav.value !== tabName) mobileNav.value = tabName;
            if (tabName !== 'reservas') renderAdminData();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Notificaciones Toast
        function showToast(message, color = 'emerald') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 transition duration-300 transform translate-y-2 pointer-events-auto`;
            toast.innerHTML = `<i class="fa-solid fa-circle-info text-${color}-400"></i> ${message}`;
            
            container.appendChild(toast);
            setTimeout(() => {
                toast.classList.add('opacity-0', 'translate-y-4');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        // Inicialización de Gráficos Chart.js
        let monthlyBookingsChart = null;
        let bookingStatusChart = null;
        function initAdminCharts() {
            if (monthlyBookingsChart && bookingStatusChart) return;

            const ctx1 = document.getElementById('chartReservasMes').getContext('2d');
            monthlyBookingsChart = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                    datasets: [{
                        label: 'Reservas',
                        data: Array(12).fill(0),
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                        y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
                    }
                }
            });

            const ctx2 = document.getElementById('chartEstadoReservas').getContext('2d');
            bookingStatusChart = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: ['Confirmadas', 'Pendientes', 'Canceladas', 'Finalizadas'],
                    datasets: [{
                        data: [0, 0, 0, 0],
                        backgroundColor: ['#22c55e', '#f59e0b', '#ef4444', '#0284c7'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12 } }
                    }
                }
            });
            renderAdminDashboard();
        }

        const currentPage = window.location.pathname.split('/').pop().toLowerCase();
        const isAdminPage = currentPage === 'admin.html';
        const isClientPage = currentPage === 'admin_cliente.html';
        const isPassagesPage = currentPage === 'pasajes.html';
        const isInvoicesPage = currentPage === 'boletas.html';
        const isPublicPage = currentPage === 'index.html' || currentPage === '';

        async function initializeSupabaseApp() {
            const gate = document.getElementById('auth-gate');
            const sessionResult = await window.supabaseClient.auth.getSession();
            if (sessionResult.error) throw sessionResult.error;
            const session = sessionResult.data.session;
            if (!session) {
                if (!isPublicPage) window.location.replace('../index.html');
                renderAccountControls();
                window.setTimeout(() => gate?.classList.remove('hidden'), 5000);
                window.OrquideasStore.loadPublicCatalog().then(publicData => {
                    packages = publicData.packages;
                    promotions = publicData.promotions;
                    renderPublicPackages();
                }).catch(error => console.warn('Public catalog could not be loaded:', error));
                return;
            }

            const role = await window.OrquideasStore.currentRole(session.user.id);
            if (isAdminPage && role !== 'admin') {
                window.location.replace('admin_cliente.html');
                return;
            }
            if ((isClientPage || isPassagesPage) && role !== 'client') {
                window.location.replace('admin.html');
                return;
            }

            const remoteData = await window.OrquideasStore.load(session.user.id, role);
            currentUser = { ...remoteData.user, id: session.user.id, email: session.user.email };
            bookings = remoteData.bookings;
            packages = remoteData.packages;
            promotions = remoteData.promotions;
            invoices = remoteData.invoices;
            complaints = remoteData.complaints || [];
            isAdminAuthenticated = role === 'admin';
            isClientAuthenticated = role === 'client';
            pendingProfileAvatar = currentUser.avatar || '';
            gate?.classList.add('hidden');
            renderAccountControls();
            renderPublicPackages();
            if (isClientPage || isAdminPage) renderBookings();
            if (isPassagesPage) renderPassages();
            if (isInvoicesPage) renderInvoices();
            if (isAdminPage) {
                renderAdminData();
                initAdminCharts();
            }
        }

        initializeSupabaseApp().catch(error => {
            const gate = document.getElementById('auth-gate');
            if (gate) {
                gate.classList.remove('hidden');
                let message = document.getElementById('auth-gate-error');
                if (!message) {
                    message = document.createElement('p');
                    message.id = 'auth-gate-error';
                    message.className = 'mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700';
                    gate.querySelector('section')?.append(message);
                }
                message.textContent = 'No se pudo cargar tu cuenta desde Supabase. Ejecuta database/schema.sql y revisa la conexión del proyecto.';
            } else {
                window.location.replace('../index.html');
            }
            console.error('Supabase initialization failed:', error);
        });

        // Ajustes iniciales de la página pública
        (function initPublicPage() {
            const year = document.getElementById('current-year');
            if (year) year.textContent = new Date().getFullYear();
            const searchDate = document.getElementById('search-date');
            if (searchDate) searchDate.min = localIsoDate();
            const bookDate = document.getElementById('book-date');
            if (bookDate) bookDate.min = localIsoDate();
        })();
