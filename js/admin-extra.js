// =====================================================================
// Panel administrativo: roles del equipo, caja, gastos, finanzas,
// destinos, personal (RR.HH.), asistencia y auditoría.
// Usa las variables y funciones globales de app.js (bookings, packages,
// destinations, currentUser, escapeHtml, showToast, setBookingStatus...).
// =====================================================================

const ROLE_LABELS = {
    admin: 'Dueño / Administrador',
    cajero: 'Cajero(a)',
    agente: 'Agente de reservas',
    rrhh: 'Recursos Humanos',
    atencion: 'Atención al cliente'
};

const ROLE_DESCRIPTIONS = {
    admin: 'Acceso total: equipo, finanzas, catálogo, auditoría.',
    cajero: 'Cobra pagos, ve la caja del día, registra gastos y emite comprobantes.',
    agente: 'Confirma, cancela y finaliza reservas; ve clientes y disponibilidad.',
    rrhh: 'Gestiona fichas del personal, planilla y asistencia.',
    atencion: 'Responde el Libro de Reclamaciones y consulta reservas y clientes.'
};

const ROLE_TABS = {
    admin: '*',
    cajero: ['dash', 'reservas', 'caja', 'ventas', 'clientes', 'gastos', 'facturacion', 'asistencia'],
    agente: ['dash', 'reservas', 'ventas', 'clientes', 'disponibilidad', 'asistencia'],
    rrhh: ['dash', 'personal', 'asistencia'],
    atencion: ['dash', 'reservas', 'clientes', 'reclamaciones', 'asistencia']
};

const PAYMENT_METHODS = { efectivo: 'Efectivo', yape: 'Yape', plin: 'Plin', transferencia: 'Transferencia', tarjeta: 'Tarjeta', otro: 'Otro' };
const EXPENSE_CATEGORIES = { planilla: 'Planilla', proveedores: 'Proveedores', transporte: 'Transporte', hospedaje: 'Hospedaje', entradas: 'Entradas / tickets', publicidad: 'Publicidad', servicios: 'Servicios (luz, agua, internet)', alquiler: 'Alquiler', impuestos: 'Impuestos', otros: 'Otros' };
const EMPLOYEE_STATUS = { activo: 'Activo', vacaciones: 'Vacaciones', licencia: 'Licencia', cesado: 'Cesado' };
const AUDIT_TABLES = { bookings: 'Reservas', payments: 'Pagos', expenses: 'Gastos', packages: 'Paquetes', destinations: 'Destinos', promotions: 'Promociones', receipts: 'Comprobantes', complaints: 'Reclamaciones', employees: 'Personal', user_roles: 'Roles' };
const AUDIT_ACTIONS = { INSERT: 'Creó', UPDATE: 'Modificó', DELETE: 'Eliminó' };

const extraState = {
    role: 'client',
    schemaMissing: false,
    payments: [],
    expenses: [],
    employees: [],
    attendance: [],
    staff: [],
    audit: [],
    names: {},
    pendingDestinationImage: '',
    financeChart: null
};

const INPUT = 'mt-1 w-full bg-slate-900 border border-slate-700 px-3 py-2.5 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500';
const CARD = 'bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-700';
const BTN_PRIMARY = 'bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-sm px-4 py-2.5 rounded-lg';
const BTN_SECONDARY = 'bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm px-4 py-2.5 rounded-lg';

// ---------- utilidades ----------
function hasRole(...roles) {
    return roles.includes(extraState.role);
}

function canAccessAdminTab(tab) {
    const allowed = ROLE_TABS[extraState.role];
    return allowed === '*' || (Array.isArray(allowed) && allowed.includes(tab));
}

function money(value) {
    return `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function limaToday() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
}

function limaDateOf(value) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(value));
}

function timeOf(value) {
    return value ? new Date(value).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' }) : '—';
}

function personName(userId) {
    if (!userId) return '—';
    if (userId === currentUser.id) return `${currentUser.name || 'Tú'} (tú)`;
    return extraState.names[userId] || 'Usuario del equipo';
}

function downloadCsv(fileName, header, rows) {
    const escapeCell = value => {
        let text = String(value ?? '');
        if (/^[=+\-@]/.test(text)) text = `'${text}`; // evita inyección de fórmulas en Excel
        return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = '﻿' + [header, ...rows].map(row => row.map(escapeCell).join(';')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function optionList(map, selected = '') {
    return Object.entries(map).map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
}

function statCard(label, value, tone = 'white', hint = '') {
    return `<div class="bg-slate-900 border border-slate-700 rounded-xl p-4"><span class="block text-[11px] font-bold uppercase text-slate-400">${escapeHtml(label)}</span><strong class="block text-xl font-black text-${tone === 'white' ? 'white' : tone + '-400'} mt-1">${value}</strong>${hint ? `<span class="block text-[11px] text-slate-500 mt-1">${escapeHtml(hint)}</span>` : ''}</div>`;
}

function emptyRow(columns, text) {
    return `<tr><td colspan="${columns}" class="p-6 text-center text-slate-400">${escapeHtml(text)}</td></tr>`;
}

function paidFor(bookingId) {
    return extraState.payments.filter(payment => payment.booking_id === bookingId).reduce((total, payment) => total + Number(payment.amount), 0);
}

function friendlyError(error, fallback) {
    const message = error?.message || '';
    if (/relation .* does not exist|Could not find the table|schema cache/i.test(message)) return 'Falta ejecutar database/equipo_y_finanzas.sql en Supabase.';
    if (/row-level security|permission denied/i.test(message)) return 'No tienes permiso para esta acción.';
    return message || fallback;
}

async function query(builder) {
    const { data, error } = await builder;
    if (error) throw error;
    return data;
}

// ---------- carga inicial ----------
async function initAdminExtras(role) {
    extraState.role = role;
    applyRoleLayout();
    const client = window.supabaseClient;
    const since = new Date(Date.now() - 400 * 86400000).toISOString();
    const tasks = [];
    if (hasRole('admin', 'cajero', 'agente')) tasks.push(query(client.from('payments').select('*').gte('created_at', since).order('created_at', { ascending: false })).then(rows => { extraState.payments = rows; }));
    if (hasRole('admin', 'cajero')) tasks.push(query(client.from('expenses').select('*').order('spent_on', { ascending: false }).limit(2000)).then(rows => { extraState.expenses = rows; }));
    if (hasRole('admin', 'rrhh')) tasks.push(query(client.from('employees').select('*').order('full_name')).then(rows => { extraState.employees = rows; }));
    tasks.push(query(client.from('attendance').select('*').gte('work_date', new Date(Date.now() - 62 * 86400000).toISOString().slice(0, 10)).order('work_date', { ascending: false })).then(rows => { extraState.attendance = rows; }));
    if (hasRole('admin')) {
        tasks.push(query(client.rpc('admin_list_staff')).then(rows => { extraState.staff = rows; }));
        tasks.push(query(client.from('audit_log').select('*').order('created_at', { ascending: false }).limit(300)).then(rows => { extraState.audit = rows; }));
    }
    const results = await Promise.allSettled(tasks);
    const failed = results.find(result => result.status === 'rejected');
    if (failed) {
        console.warn('Módulos del equipo no disponibles:', failed.reason);
        extraState.schemaMissing = /does not exist|schema cache|Could not find/i.test(failed.reason?.message || '');
    }
    await loadPeopleNames();
    renderDestinationOptions();
    renderDashboardExtras();
    if (hasRole('admin')) injectAuditSection();
    if (!canAccessAdminTab('dash')) switchAdminTab(ROLE_TABS[role][0]);
}

async function loadPeopleNames() {
    extraState.staff.forEach(member => { extraState.names[member.user_id] = member.full_name || member.email; });
    extraState.employees.forEach(employee => { if (employee.user_id) extraState.names[employee.user_id] = employee.full_name; });
    const ids = [...new Set([...extraState.payments.map(row => row.received_by), ...extraState.expenses.map(row => row.registered_by), ...extraState.attendance.map(row => row.user_id)])]
        .filter(id => id && !extraState.names[id]);
    if (!ids.length) return;
    try {
        const rows = await query(window.supabaseClient.from('profiles').select('user_id, full_name, email').in('user_id', ids.slice(0, 100)));
        rows.forEach(row => { extraState.names[row.user_id] = row.full_name || row.email; });
    } catch (error) {
        console.warn('No se pudieron cargar nombres:', error);
    }
}

function applyRoleLayout() {
    const role = extraState.role;
    document.querySelectorAll('[data-admin-tab]').forEach(button => {
        button.classList.toggle('hidden', !canAccessAdminTab(button.dataset.adminTab));
    });
    document.querySelectorAll('[data-nav-section]').forEach(section => {
        section.classList.toggle('hidden', !section.querySelector('[data-admin-tab]:not(.hidden)'));
    });
    const mobileNav = document.getElementById('admin-mobile-nav');
    if (mobileNav) {
        mobileNav.innerHTML = [...document.querySelectorAll('[data-admin-tab]:not(.hidden)')]
            .map(button => `<option value="${escapeHtml(button.dataset.adminTab)}">${escapeHtml(button.textContent.trim())}</option>`).join('');
    }
    const label = ROLE_LABELS[role] || 'Equipo';
    const setText = (id, text) => { const element = document.getElementById(id); if (element) element.textContent = text; };
    setText('admin-role-chip', label);
    setText('admin-user-name', currentUser.name || currentUser.email || 'Usuario');
    setText('admin-user-role', `● ${label}`);
    setText('admin-panel-title', role === 'admin' ? 'Panel del Dueño' : `Panel · ${label}`);
    // Formularios que solo el dueño puede usar
    if (!hasRole('admin', 'cajero')) document.querySelectorAll('#admin-tab-facturacion form').forEach(form => form.classList.add('hidden'));
}

// ---------- reservas: acciones según rol ----------
function adminBookingActions(booking) {
    const code = escapeHtml(booking.code);
    const paid = paidFor(booking.id);
    const balance = Math.max(0, Number(booking.total) - paid);
    const canManage = hasRole('admin', 'cajero', 'agente');
    const canCharge = hasRole('admin', 'cajero');
    const parts = [];
    if (hasRole('admin', 'cajero', 'agente')) {
        parts.push(balance <= 0
            ? '<span class="inline-block bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded text-[10px] mr-1">PAGADO</span>'
            : `<span class="inline-block text-[10px] text-slate-400 mr-1">Saldo ${money(balance)}</span>`);
    }
    if (canCharge && balance > 0 && ['PENDIENTE', 'CONFIRMADA'].includes(booking.status)) {
        parts.push(`<button type="button" onclick="openPaymentFor('${escapeHtml(booking.id)}')" class="bg-sky-600 hover:bg-sky-500 text-white font-bold px-2.5 py-1 rounded text-[10px]">Cobrar</button>`);
    }
    if (canManage && booking.status === 'PENDIENTE') {
        parts.push(`<button type="button" onclick="adminConfirmBooking('${code}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded text-[10px]">Confirmar</button>`);
        parts.push(`<button type="button" onclick="adminRejectBooking('${code}')" class="bg-rose-600 hover:bg-rose-500 text-white font-bold px-2.5 py-1 rounded text-[10px]">Cancelar</button>`);
    }
    if (canManage && booking.status === 'CONFIRMADA') {
        parts.push(`<button type="button" onclick="finishBooking('${code}')" class="bg-slate-600 hover:bg-slate-500 text-white font-bold px-2.5 py-1 rounded text-[10px]">Finalizar</button>`);
    }
    return parts.length ? parts.join(' ') : '<span class="text-slate-500 italic text-[10px]">Solo lectura</span>';
}

function finishBooking(code) {
    if (confirm(`¿Marcar la reserva ${code} como FINALIZADA (viaje realizado)?`)) setBookingStatus(code, 'FINALIZADA');
}

function openPaymentFor(bookingId) {
    switchAdminTab('caja');
    const select = document.getElementById('payment-booking');
    if (select) {
        select.value = bookingId;
        updatePaymentHint();
        document.getElementById('payment-amount')?.focus();
    }
}

// ---------- dashboard ----------
function renderDashboardExtras() {
    const dash = document.getElementById('admin-tab-dash');
    if (!dash) return;
    let box = document.getElementById('admin-dash-extra');
    if (!box) {
        box = document.createElement('div');
        box.id = 'admin-dash-extra';
        box.className = 'space-y-4';
        const alerts = document.getElementById('admin-alerts');
        alerts ? alerts.after(box) : dash.prepend(box);
    }
    const parts = [];
    if (extraState.schemaMissing) {
        parts.push('<div class="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"><i class="fa-solid fa-triangle-exclamation mr-2" aria-hidden="true"></i>Para activar caja, gastos, equipo, asistencia, destinos y auditoría, ejecuta <b>database/equipo_y_finanzas.sql</b> en Supabase.</div>');
    }
    parts.push(myAttendanceCard());
    if (hasRole('admin', 'cajero')) {
        const today = limaToday();
        const month = today.slice(0, 7);
        const todayIncome = extraState.payments.filter(row => limaDateOf(row.created_at) === today).reduce((total, row) => total + Number(row.amount), 0);
        const monthIncome = extraState.payments.filter(row => limaDateOf(row.created_at).startsWith(month)).reduce((total, row) => total + Number(row.amount), 0);
        const monthExpenses = extraState.expenses.filter(row => row.spent_on.startsWith(month)).reduce((total, row) => total + Number(row.amount), 0);
        const receivable = bookings.filter(booking => ['PENDIENTE', 'CONFIRMADA'].includes(booking.status)).reduce((total, booking) => total + Math.max(0, Number(booking.total) - paidFor(booking.id)), 0);
        const cards = [statCard('Cobrado hoy', money(todayIncome), 'emerald'), statCard('Cobrado este mes', money(monthIncome), 'emerald'), statCard('Por cobrar', money(receivable), 'amber', 'Reservas activas con saldo')];
        if (hasRole('admin')) cards.push(statCard('Utilidad del mes', money(monthIncome - monthExpenses), monthIncome - monthExpenses >= 0 ? 'sky' : 'rose', `Gastos: ${money(monthExpenses)}`));
        parts.push(`<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">${cards.join('')}</div>`);
    }
    box.innerHTML = parts.join('');
}

// ---------- asistencia ----------
function myAttendanceToday() {
    return extraState.attendance.find(row => row.user_id === currentUser.id && row.work_date === limaToday());
}

function myAttendanceCard() {
    const today = myAttendanceToday();
    const status = !today?.check_in ? 'Aún no marcas tu entrada de hoy.' : !today.check_out ? `Entrada registrada a las ${timeOf(today.check_in)}.` : `Jornada completa: ${timeOf(today.check_in)} – ${timeOf(today.check_out)}.`;
    const button = !today?.check_in
        ? `<button type="button" onclick="markAttendance('in')" class="${BTN_PRIMARY}"><i class="fa-solid fa-right-to-bracket mr-2" aria-hidden="true"></i>Marcar entrada</button>`
        : !today.check_out ? `<button type="button" onclick="markAttendance('out')" class="${BTN_SECONDARY}"><i class="fa-solid fa-right-from-bracket mr-2" aria-hidden="true"></i>Marcar salida</button>` : '';
    return `<div class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200"><i class="fa-solid fa-clock text-brand-400" aria-hidden="true"></i><span class="flex-1 min-w-[200px]">${escapeHtml(status)}</span>${button}</div>`;
}

async function markAttendance(type) {
    try {
        const row = await query(window.supabaseClient.rpc(type === 'in' ? 'clock_in' : 'clock_out'));
        extraState.attendance = [row, ...extraState.attendance.filter(item => item.id !== row.id)];
        renderDashboardExtras();
        renderAttendanceTab();
        showToast(type === 'in' ? 'Entrada registrada.' : 'Salida registrada.');
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo registrar la asistencia.'), 'rose');
    }
}

function hoursBetween(start, end) {
    if (!start || !end) return '—';
    const minutes = Math.round((new Date(end) - new Date(start)) / 60000);
    return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}

function renderAttendanceTab() {
    const tab = document.getElementById('admin-tab-asistencia');
    if (!tab) return;
    const seesAll = hasRole('admin', 'rrhh');
    const from = document.getElementById('attendance-from')?.value || (seesAll ? limaToday() : '');
    const to = document.getElementById('attendance-to')?.value || limaToday();
    const rows = extraState.attendance
        .filter(row => seesAll || row.user_id === currentUser.id)
        .filter(row => (!from || row.work_date >= from) && (!to || row.work_date <= to));
    tab.innerHTML = `
        ${myAttendanceCard()}
        <section class="${CARD}">
            <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
                <div><h3 class="font-extrabold text-lg text-white">${seesAll ? 'Asistencia del equipo' : 'Mi asistencia'}</h3><p class="text-xs text-slate-400 mt-1">Hora de Lima. Se muestran los últimos 2 meses.</p></div>
                <div class="flex flex-wrap gap-2 items-end">
                    <label class="text-xs text-slate-300">Desde<input id="attendance-from" type="date" value="${escapeHtml(from)}" onchange="renderAttendanceTab()" class="${INPUT}"></label>
                    <label class="text-xs text-slate-300">Hasta<input id="attendance-to" type="date" value="${escapeHtml(to)}" onchange="renderAttendanceTab()" class="${INPUT}"></label>
                    <button type="button" onclick="exportAttendance()" class="${BTN_SECONDARY}"><i class="fa-solid fa-file-csv mr-1" aria-hidden="true"></i>CSV</button>
                </div>
            </div>
            <div class="overflow-x-auto"><table class="w-full min-w-[560px] text-left text-xs text-slate-300">
                <thead class="bg-slate-900 text-slate-400 uppercase"><tr><th class="p-3">Fecha</th>${seesAll ? '<th class="p-3">Persona</th>' : ''}<th class="p-3">Entrada</th><th class="p-3">Salida</th><th class="p-3">Horas</th></tr></thead>
                <tbody class="divide-y divide-slate-700/50">${rows.length ? rows.map(row => `<tr><td class="p-3">${escapeHtml(formatDate(row.work_date))}</td>${seesAll ? `<td class="p-3 text-white font-semibold">${escapeHtml(personName(row.user_id))}</td>` : ''}<td class="p-3">${timeOf(row.check_in)}</td><td class="p-3">${row.check_out ? timeOf(row.check_out) : '<span class="text-amber-300">Sin salida</span>'}</td><td class="p-3">${hoursBetween(row.check_in, row.check_out)}</td></tr>`).join('') : emptyRow(seesAll ? 5 : 4, 'Sin registros en este rango.')}</tbody>
            </table></div>
        </section>`;
}

function exportAttendance() {
    downloadCsv(`asistencia-${limaToday()}.csv`, ['Fecha', 'Persona', 'Entrada', 'Salida', 'Horas'],
        extraState.attendance.map(row => [row.work_date, personName(row.user_id), timeOf(row.check_in), row.check_out ? timeOf(row.check_out) : '', hoursBetween(row.check_in, row.check_out)]));
}

// ---------- caja y pagos ----------
function chargeableBookings() {
    return bookings.filter(booking => ['PENDIENTE', 'CONFIRMADA'].includes(booking.status) && Number(booking.total) - paidFor(booking.id) > 0.009);
}

function renderCashTab() {
    const tab = document.getElementById('admin-tab-caja');
    if (!tab) return;
    const day = document.getElementById('cash-day')?.value || limaToday();
    const dayPayments = extraState.payments.filter(row => limaDateOf(row.created_at) === day);
    const dayExpenses = extraState.expenses.filter(row => row.spent_on === day);
    const byMethod = Object.keys(PAYMENT_METHODS).map(method => [method, dayPayments.filter(row => row.method === method).reduce((total, row) => total + Number(row.amount), 0)]);
    const totalDay = dayPayments.reduce((total, row) => total + Number(row.amount), 0);
    const cashIn = byMethod.find(([method]) => method === 'efectivo')[1];
    const cashOut = dayExpenses.filter(row => row.method === 'efectivo').reduce((total, row) => total + Number(row.amount), 0);
    const options = chargeableBookings().map(booking => `<option value="${escapeHtml(booking.id)}">${escapeHtml(booking.code)} · ${escapeHtml(booking.customer || booking.email)} · saldo ${money(Number(booking.total) - paidFor(booking.id))}</option>`).join('');
    const canCharge = hasRole('admin', 'cajero');
    tab.innerHTML = `
        <section class="${CARD}">
            <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
                <div><h3 class="font-extrabold text-lg text-white">Caja del día</h3><p class="text-xs text-slate-400 mt-1">Ingresos registrados por método de pago.</p></div>
                <div class="flex gap-2 items-end">
                    <label class="text-xs text-slate-300">Día<input id="cash-day" type="date" value="${escapeHtml(day)}" max="${limaToday()}" onchange="renderCashTab()" class="${INPUT}"></label>
                    <button type="button" onclick="window.print()" class="${BTN_SECONDARY}" title="Imprimir cierre"><i class="fa-solid fa-print" aria-hidden="true"></i></button>
                    <button type="button" onclick="exportPayments('${escapeHtml(day)}')" class="${BTN_SECONDARY}"><i class="fa-solid fa-file-csv mr-1" aria-hidden="true"></i>CSV</button>
                </div>
            </div>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                ${statCard('Total cobrado', money(totalDay), 'emerald', `${dayPayments.length} pago(s)`)}
                ${statCard('Efectivo en caja', money(cashIn - cashOut), 'amber', `Ingresos ${money(cashIn)} − gastos ${money(cashOut)}`)}
                ${byMethod.filter(([method]) => method !== 'efectivo').map(([method, amount]) => statCard(PAYMENT_METHODS[method], money(amount))).join('')}
            </div>
        </section>
        ${canCharge ? `<section class="${CARD}">
            <h3 class="font-extrabold text-lg text-white mb-4">Registrar pago</h3>
            ${options ? `<form onsubmit="event.preventDefault(); savePayment(this);" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <label class="text-xs text-slate-300 sm:col-span-2">Reserva<select id="payment-booking" name="booking" required onchange="updatePaymentHint()" class="${INPUT}">${options}</select></label>
                <label class="text-xs text-slate-300">Monto (S/)<input id="payment-amount" name="amount" type="number" min="0.01" step="0.01" required class="${INPUT}"></label>
                <label class="text-xs text-slate-300">Método<select name="method" class="${INPUT}">${optionList(PAYMENT_METHODS, 'efectivo')}</select></label>
                <label class="text-xs text-slate-300">N.° operación / referencia<input name="reference" maxlength="120" class="${INPUT}"></label>
                <label class="text-xs text-slate-300 sm:col-span-2">Nota<input name="note" maxlength="500" class="${INPUT}"></label>
                <label class="flex items-center gap-2 text-xs text-slate-300"><input name="autoConfirm" type="checkbox" checked class="rounded border-slate-600 text-brand-600 focus:ring-brand-500"> Confirmar reserva si queda pagada</label>
                <p id="payment-hint" class="sm:col-span-2 xl:col-span-3 text-xs text-slate-400"></p>
                <button type="submit" class="${BTN_PRIMARY}"><i class="fa-solid fa-floppy-disk mr-2" aria-hidden="true"></i>Registrar pago</button>
            </form>` : '<p class="text-sm text-slate-400">No hay reservas con saldo pendiente.</p>'}
        </section>` : ''}
        <section class="${CARD}">
            <h3 class="font-extrabold text-lg text-white mb-4">Pagos del ${escapeHtml(formatDate(day))}</h3>
            <div class="overflow-x-auto"><table class="w-full min-w-[680px] text-left text-xs text-slate-300">
                <thead class="bg-slate-900 text-slate-400 uppercase"><tr><th class="p-3">Hora</th><th class="p-3">Reserva</th><th class="p-3">Cliente</th><th class="p-3">Método</th><th class="p-3">Referencia</th><th class="p-3">Monto</th><th class="p-3">Cobró</th>${hasRole('admin') ? '<th class="p-3"></th>' : ''}</tr></thead>
                <tbody class="divide-y divide-slate-700/50">${dayPayments.length ? dayPayments.map(row => {
                    const booking = bookings.find(item => item.id === row.booking_id);
                    return `<tr><td class="p-3">${timeOf(row.created_at)}</td><td class="p-3 font-mono text-brand-400">${escapeHtml(booking?.code || '—')}</td><td class="p-3 text-white">${escapeHtml(booking?.customer || '—')}</td><td class="p-3">${escapeHtml(PAYMENT_METHODS[row.method] || row.method)}</td><td class="p-3">${escapeHtml(row.reference || '—')}</td><td class="p-3 font-bold text-emerald-300">${money(row.amount)}</td><td class="p-3">${escapeHtml(personName(row.received_by))}</td>${hasRole('admin') ? `<td class="p-3 text-right"><button type="button" onclick="deletePayment('${escapeHtml(row.id)}')" class="text-rose-300 font-bold">Anular</button></td>` : ''}</tr>`;
                }).join('') : emptyRow(8, 'No hay pagos registrados este día.')}</tbody>
            </table></div>
        </section>`;
    updatePaymentHint();
}

function updatePaymentHint() {
    const select = document.getElementById('payment-booking');
    const hint = document.getElementById('payment-hint');
    const amount = document.getElementById('payment-amount');
    if (!select || !hint) return;
    const booking = bookings.find(item => item.id === select.value);
    if (!booking) return;
    const paid = paidFor(booking.id);
    const balance = Number(booking.total) - paid;
    hint.textContent = `${booking.packageName} · ${booking.passengers} pasajero(s) · Total ${money(booking.total)} · Pagado ${money(paid)} · Saldo ${money(balance)} · Estado ${booking.status}`;
    if (amount) {
        amount.max = balance.toFixed(2);
        if (!amount.value) amount.value = balance.toFixed(2);
    }
}

async function savePayment(form) {
    const button = form.querySelector('[type="submit"]');
    const bookingId = form.elements.booking.value;
    const amount = Number(form.elements.amount.value);
    const booking = bookings.find(item => item.id === bookingId);
    if (!booking || !(amount > 0)) return;
    button.disabled = true;
    try {
        const row = await query(window.supabaseClient.from('payments').insert({
            booking_id: bookingId,
            amount,
            method: form.elements.method.value,
            reference: form.elements.reference.value.trim() || null,
            note: form.elements.note.value.trim() || null
        }).select('*').single());
        extraState.payments.unshift(row);
        showToast(`Pago de ${money(amount)} registrado para ${booking.code}.`);
        if (form.elements.autoConfirm.checked && booking.status === 'PENDIENTE' && Number(booking.total) - paidFor(booking.id) <= 0.009) {
            await setBookingStatus(booking.code, 'CONFIRMADA');
        }
        renderCashTab();
        renderDashboardExtras();
        renderBookings();
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo registrar el pago.'), 'rose');
        button.disabled = false;
    }
}

async function deletePayment(paymentId) {
    if (!confirm('¿Anular este pago? Quedará registrado en la auditoría.')) return;
    try {
        await query(window.supabaseClient.from('payments').delete().eq('id', paymentId));
        extraState.payments = extraState.payments.filter(row => row.id !== paymentId);
        renderCashTab();
        renderDashboardExtras();
        renderBookings();
        showToast('Pago anulado.');
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo anular el pago.'), 'rose');
    }
}

function exportPayments(day) {
    const rows = extraState.payments.filter(row => !day || limaDateOf(row.created_at) === day).map(row => {
        const booking = bookings.find(item => item.id === row.booking_id);
        return [limaDateOf(row.created_at), timeOf(row.created_at), booking?.code || '', booking?.customer || '', PAYMENT_METHODS[row.method] || row.method, row.reference || '', Number(row.amount).toFixed(2), personName(row.received_by)];
    });
    downloadCsv(`caja-${day || 'todo'}.csv`, ['Fecha', 'Hora', 'Reserva', 'Cliente', 'Método', 'Referencia', 'Monto', 'Cobró'], rows);
}

// ---------- gastos ----------
function renderExpensesTab() {
    const tab = document.getElementById('admin-tab-gastos');
    if (!tab) return;
    const month = document.getElementById('expense-month')?.value || limaToday().slice(0, 7);
    const rows = extraState.expenses.filter(row => row.spent_on.startsWith(month));
    const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
    const byCategory = Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => [label, rows.filter(row => row.category === key).reduce((sum, row) => sum + Number(row.amount), 0)]).filter(([, amount]) => amount > 0);
    tab.innerHTML = `
        <section class="${CARD}">
            <h3 class="font-extrabold text-lg text-white mb-4">Registrar gasto</h3>
            <form onsubmit="event.preventDefault(); saveExpense(this);" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                <label class="text-xs text-slate-300">Fecha<input name="date" type="date" value="${limaToday()}" max="${limaToday()}" required class="${INPUT}"></label>
                <label class="text-xs text-slate-300">Categoría<select name="category" class="${INPUT}">${optionList(EXPENSE_CATEGORIES, 'proveedores')}</select></label>
                <label class="text-xs text-slate-300 xl:col-span-2">Descripción<input name="description" required minlength="3" maxlength="300" class="${INPUT}"></label>
                <label class="text-xs text-slate-300">Monto (S/)<input name="amount" type="number" min="0.01" step="0.01" required class="${INPUT}"></label>
                <label class="text-xs text-slate-300">Pagado con<select name="method" class="${INPUT}">${optionList(PAYMENT_METHODS, 'efectivo')}</select></label>
                <div class="flex items-end"><button type="submit" class="${BTN_PRIMARY} w-full"><i class="fa-solid fa-plus mr-2" aria-hidden="true"></i>Agregar gasto</button></div>
            </form>
        </section>
        <section class="${CARD}">
            <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
                <div><h3 class="font-extrabold text-lg text-white">Gastos del mes</h3><p class="text-xs text-slate-400 mt-1">Total: <b class="text-rose-300">${money(total)}</b></p></div>
                <div class="flex gap-2 items-end">
                    <label class="text-xs text-slate-300">Mes<input id="expense-month" type="month" value="${escapeHtml(month)}" onchange="renderExpensesTab()" class="${INPUT}"></label>
                    <button type="button" onclick="exportExpenses('${escapeHtml(month)}')" class="${BTN_SECONDARY}"><i class="fa-solid fa-file-csv mr-1" aria-hidden="true"></i>CSV</button>
                </div>
            </div>
            ${byCategory.length ? `<div class="flex flex-wrap gap-2 mb-4">${byCategory.map(([label, amount]) => `<span class="bg-slate-900 border border-slate-700 rounded-full px-3 py-1 text-xs text-slate-300">${escapeHtml(label)}: <b class="text-white">${money(amount)}</b></span>`).join('')}</div>` : ''}
            <div class="overflow-x-auto"><table class="w-full min-w-[640px] text-left text-xs text-slate-300">
                <thead class="bg-slate-900 text-slate-400 uppercase"><tr><th class="p-3">Fecha</th><th class="p-3">Categoría</th><th class="p-3">Descripción</th><th class="p-3">Método</th><th class="p-3">Monto</th><th class="p-3">Registró</th>${hasRole('admin') ? '<th class="p-3"></th>' : ''}</tr></thead>
                <tbody class="divide-y divide-slate-700/50">${rows.length ? rows.map(row => `<tr><td class="p-3">${escapeHtml(formatDate(row.spent_on))}</td><td class="p-3">${escapeHtml(EXPENSE_CATEGORIES[row.category] || row.category)}</td><td class="p-3 text-white">${escapeHtml(row.description)}</td><td class="p-3">${escapeHtml(PAYMENT_METHODS[row.method] || row.method)}</td><td class="p-3 font-bold text-rose-300">${money(row.amount)}</td><td class="p-3">${escapeHtml(personName(row.registered_by))}</td>${hasRole('admin') ? `<td class="p-3 text-right"><button type="button" onclick="deleteExpense('${escapeHtml(row.id)}')" class="text-rose-300 font-bold">Eliminar</button></td>` : ''}</tr>`).join('') : emptyRow(7, 'Sin gastos este mes.')}</tbody>
            </table></div>
        </section>`;
}

async function saveExpense(form) {
    try {
        const row = await query(window.supabaseClient.from('expenses').insert({
            spent_on: form.elements.date.value,
            category: form.elements.category.value,
            description: form.elements.description.value.trim(),
            amount: Number(form.elements.amount.value),
            method: form.elements.method.value
        }).select('*').single());
        extraState.expenses.unshift(row);
        extraState.expenses.sort((left, right) => right.spent_on.localeCompare(left.spent_on));
        renderExpensesTab();
        renderDashboardExtras();
        showToast('Gasto registrado.');
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo registrar el gasto.'), 'rose');
    }
}

async function deleteExpense(expenseId) {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
        await query(window.supabaseClient.from('expenses').delete().eq('id', expenseId));
        extraState.expenses = extraState.expenses.filter(row => row.id !== expenseId);
        renderExpensesTab();
        renderDashboardExtras();
        showToast('Gasto eliminado.');
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo eliminar el gasto.'), 'rose');
    }
}

function exportExpenses(month) {
    downloadCsv(`gastos-${month}.csv`, ['Fecha', 'Categoría', 'Descripción', 'Método', 'Monto', 'Registró'],
        extraState.expenses.filter(row => row.spent_on.startsWith(month)).map(row => [row.spent_on, EXPENSE_CATEGORIES[row.category] || row.category, row.description, PAYMENT_METHODS[row.method] || row.method, Number(row.amount).toFixed(2), personName(row.registered_by)]));
}

// ---------- resumen financiero (dueño) ----------
function renderFinanceTab() {
    const tab = document.getElementById('admin-tab-finanzas');
    if (!tab) return;
    const years = [...new Set([limaToday().slice(0, 4), ...extraState.payments.map(row => limaDateOf(row.created_at).slice(0, 4)), ...extraState.expenses.map(row => row.spent_on.slice(0, 4))])].sort().reverse();
    const year = document.getElementById('finance-year')?.value || years[0];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const income = months.map((_, index) => extraState.payments.filter(row => limaDateOf(row.created_at).startsWith(`${year}-${String(index + 1).padStart(2, '0')}`)).reduce((sum, row) => sum + Number(row.amount), 0));
    const spent = months.map((_, index) => extraState.expenses.filter(row => row.spent_on.startsWith(`${year}-${String(index + 1).padStart(2, '0')}`)).reduce((sum, row) => sum + Number(row.amount), 0));
    const totalIncome = income.reduce((a, b) => a + b, 0);
    const totalSpent = spent.reduce((a, b) => a + b, 0);
    const receivable = bookings.filter(booking => ['PENDIENTE', 'CONFIRMADA'].includes(booking.status)).reduce((sum, booking) => sum + Math.max(0, Number(booking.total) - paidFor(booking.id)), 0);
    const payroll = extraState.employees.filter(row => row.status !== 'cesado').reduce((sum, row) => sum + Number(row.salary), 0);
    const packageRevenue = Object.entries(bookings.filter(booking => ['CONFIRMADA', 'FINALIZADA'].includes(booking.status) && booking.date.startsWith(year)).reduce((groups, booking) => {
        groups[booking.packageName] = (groups[booking.packageName] || 0) + Number(booking.total);
        return groups;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
    tab.innerHTML = `
        <section class="${CARD}">
            <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
                <div><h3 class="font-extrabold text-lg text-white">Resumen financiero</h3><p class="text-xs text-slate-400 mt-1">Ingresos = pagos cobrados. Gastos = egresos registrados.</p></div>
                <label class="text-xs text-slate-300">Año<select id="finance-year" onchange="renderFinanceTab()" class="${INPUT}">${years.map(item => `<option ${item === year ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select></label>
            </div>
            <div class="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-5">
                ${statCard('Ingresos', money(totalIncome), 'emerald')}
                ${statCard('Gastos', money(totalSpent), 'rose')}
                ${statCard('Utilidad', money(totalIncome - totalSpent), totalIncome - totalSpent >= 0 ? 'sky' : 'rose', totalIncome ? `Margen ${Math.round(((totalIncome - totalSpent) / totalIncome) * 100)}%` : '')}
                ${statCard('Por cobrar', money(receivable), 'amber')}
                ${statCard('Planilla mensual', money(payroll), 'white', 'Personal no cesado')}
            </div>
            <div class="h-64 sm:h-72"><canvas id="finance-chart" aria-label="Ingresos y gastos por mes" role="img"></canvas></div>
        </section>
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <section class="${CARD}">
                <h3 class="font-extrabold text-white mb-3">Detalle mensual ${escapeHtml(year)}</h3>
                <div class="overflow-x-auto"><table class="w-full min-w-[420px] text-left text-xs text-slate-300">
                    <thead class="bg-slate-900 text-slate-400 uppercase"><tr><th class="p-2.5">Mes</th><th class="p-2.5">Ingresos</th><th class="p-2.5">Gastos</th><th class="p-2.5">Utilidad</th></tr></thead>
                    <tbody class="divide-y divide-slate-700/50">${months.map((label, index) => `<tr><td class="p-2.5">${label}</td><td class="p-2.5 text-emerald-300">${money(income[index])}</td><td class="p-2.5 text-rose-300">${money(spent[index])}</td><td class="p-2.5 font-bold ${income[index] - spent[index] >= 0 ? 'text-white' : 'text-rose-400'}">${money(income[index] - spent[index])}</td></tr>`).join('')}</tbody>
                </table></div>
            </section>
            <section class="${CARD}">
                <h3 class="font-extrabold text-white mb-3">Paquetes más vendidos ${escapeHtml(year)}</h3>
                ${packageRevenue.length ? `<ol class="space-y-2 text-sm">${packageRevenue.map(([name, amount], index) => `<li class="flex justify-between gap-3 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"><span class="text-slate-200">${index + 1}. ${escapeHtml(name)}</span><b class="text-emerald-300">${money(amount)}</b></li>`).join('')}</ol>` : '<p class="text-sm text-slate-400">Aún no hay ventas confirmadas este año.</p>'}
            </section>
        </div>`;
    if (window.Chart) {
        extraState.financeChart?.destroy();
        extraState.financeChart = new Chart(document.getElementById('finance-chart'), {
            type: 'bar',
            data: { labels: months, datasets: [{ label: 'Ingresos', data: income, backgroundColor: '#22c55e' }, { label: 'Gastos', data: spent, backgroundColor: '#f43f5e' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#cbd5e1' } } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } } } }
        });
    }
}

// ---------- destinos ----------
function slugify(value) {
    return normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function renderDestinationOptions() {
    const list = document.getElementById('admin-destination-options');
    if (list && Array.isArray(destinations)) list.innerHTML = destinations.map(item => `<option value="${escapeHtml(item.name)}"></option>`).join('');
}

function packagesForDestination(destination) {
    const words = [destination.slug, ...destination.keywords].map(normalizeText);
    return packages.filter(item => words.some(word => word && normalizeText(`${item.destination} ${item.name}`).includes(word))).length;
}

function renderDestinationsTab() {
    const tab = document.getElementById('admin-tab-destinos');
    if (!tab) return;
    if (!Array.isArray(destinations)) {
        tab.innerHTML = `<section class="${CARD}"><p class="text-sm text-amber-200">Ejecuta <b>database/equipo_y_finanzas.sql</b> en Supabase para administrar destinos.</p></section>`;
        return;
    }
    tab.innerHTML = `
        <section class="${CARD}">
            <h3 class="font-extrabold text-lg text-white mb-1">Destinos de la página principal</h3>
            <p class="text-xs text-slate-400 mb-4">Se muestran en la sección "Explora Nuestros Destinos" y en el buscador. Las palabras clave sirven para relacionar paquetes.</p>
            <form id="destination-form" onsubmit="event.preventDefault(); saveDestinationForm(this);" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <input type="hidden" name="id">
                <label class="text-xs text-slate-300">Nombre<input name="name" required minlength="2" maxlength="80" oninput="if(!this.form.elements.id.value) this.form.elements.slug.value = slugify(this.value)" class="${INPUT}"></label>
                <label class="text-xs text-slate-300">Identificador (URL)<input name="slug" required pattern="[a-z0-9-]{2,40}" maxlength="40" class="${INPUT}"></label>
                <label class="text-xs text-slate-300">Región / etiqueta<input name="region" maxlength="40" placeholder="Sierra Sur" class="${INPUT}"></label>
                <label class="text-xs text-slate-300">Orden<input name="order" type="number" value="${destinations.length + 1}" class="${INPUT}"></label>
                <label class="text-xs text-slate-300 sm:col-span-2">Descripción corta<textarea name="description" rows="2" maxlength="300" class="${INPUT}"></textarea></label>
                <label class="text-xs text-slate-300 sm:col-span-2">Palabras clave (separadas por coma)<input name="keywords" maxlength="300" placeholder="cusco, machu picchu, valle sagrado" class="${INPUT}"></label>
                <div class="sm:col-span-2 xl:col-span-4 grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 items-center rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                    <div class="aspect-[3/4] overflow-hidden rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center"><img id="destination-preview" class="hidden w-full h-full object-cover" alt="Vista previa del destino"><i id="destination-preview-icon" class="fa-solid fa-image text-2xl text-slate-500" aria-hidden="true"></i></div>
                    <div class="space-y-3">
                        <label class="inline-flex items-center gap-2 cursor-pointer ${BTN_SECONDARY}"><i class="fa-solid fa-upload" aria-hidden="true"></i>Subir foto (JPG, PNG o WEBP, máx. 1.5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" onchange="handleDestinationImage(this)"></label>
                        <label class="block text-xs text-slate-300">…o pega la URL de una imagen<input name="imageUrl" type="url" maxlength="500" oninput="previewDestinationUrl(this.value)" class="${INPUT}"></label>
                    </div>
                </div>
                <fieldset class="sm:col-span-2 xl:col-span-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
                    <legend class="px-2 text-xs font-bold text-emerald-300"><i class="fa-solid fa-street-view mr-1" aria-hidden="true"></i>Visita virtual (opcional)</legend>
                    <label class="text-xs text-slate-300">Foto 360° (URL https) — si la dejas vacía se usa la foto principal como panorámica<input name="tourUrl" type="url" maxlength="500" placeholder="https://..." class="${INPUT}"></label>
                    <label class="inline-flex items-center justify-center gap-2 cursor-pointer ${BTN_SECONDARY}"><i class="fa-solid fa-upload" aria-hidden="true"></i><span id="tour-upload-label">Subir foto 360° (JPG, máx. 15 MB)</span><input type="file" accept="image/jpeg,image/webp" class="sr-only" onchange="uploadDestinationTour(this)"></label>
                    <label class="text-xs text-slate-300">Enlace a tour 360° externo (opcional, se abre en otra pestaña)<input name="externalTourUrl" type="url" maxlength="500" placeholder="https://..." class="${INPUT}"></label>
                    <label class="text-xs text-slate-300">Texto del botón externo<input name="externalTourLabel" maxlength="60" placeholder="Tour 360° oficial" class="${INPUT}"></label>
                    <label class="flex items-center gap-2 text-xs text-slate-300 lg:col-span-2"><input name="tourIs360" type="checkbox" class="rounded border-slate-600 text-brand-600 focus:ring-brand-500"> Es una foto 360° completa (proporción 2:1, tomada con cámara 360° o el modo esfera del celular)</label>
                </fieldset>
                <label class="flex items-center gap-2 text-xs text-slate-300"><input name="active" type="checkbox" checked class="rounded border-slate-600 text-brand-600 focus:ring-brand-500"> Publicar destino</label>
                <div class="flex gap-2 sm:col-span-1 xl:col-span-3 justify-end">
                    <button type="button" onclick="resetDestinationForm()" class="${BTN_SECONDARY}">Limpiar</button>
                    <button type="submit" class="${BTN_PRIMARY}"><i class="fa-solid fa-floppy-disk mr-2" aria-hidden="true"></i>Guardar destino</button>
                </div>
            </form>
        </section>
        <section id="scene-manager" class="${CARD} hidden"></section>
        <section class="${CARD}">
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                ${destinations.length ? destinations.map(item => `<article class="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
                    ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" class="w-full h-36 object-cover">` : '<div class="h-36 bg-slate-800 grid place-items-center text-slate-500 text-xs">Sin foto</div>'}
                    <div class="p-4 flex-1 flex flex-col gap-2 text-xs">
                        <div class="flex items-center justify-between gap-2"><h4 class="font-bold text-white text-sm">${escapeHtml(item.name)}</h4><span class="px-2 py-0.5 rounded font-bold text-[10px] ${item.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'}">${item.active ? 'Publicado' : 'Oculto'}</span></div>
                        <p class="text-slate-400">${escapeHtml(item.region)} · orden ${Number(item.order)} · ${packagesForDestination(item)} paquete(s)</p>
                        <p class="text-slate-300 line-clamp-2">${escapeHtml(item.description)}</p>
                        ${item.tourUrl ? `<p class="text-emerald-300"><i class="fa-solid fa-street-view mr-1" aria-hidden="true"></i>${item.tourIs360 ? 'Tiene foto 360°' : 'Tiene panorámica propia'}</p>` : ''}
                        <div class="mt-auto flex flex-wrap gap-3 pt-2"><button type="button" onclick="openVirtualTour('${escapeHtml(item.slug)}')" class="text-emerald-300 font-bold">Probar visita</button><button type="button" onclick="openSceneManager('${escapeHtml(item.id)}')" class="text-orange-300 font-bold">Escenas 360°</button><button type="button" onclick="editDestination('${escapeHtml(item.id)}')" class="text-sky-300 font-bold">Editar</button><button type="button" onclick="toggleDestination('${escapeHtml(item.id)}')" class="text-amber-300 font-bold">${item.active ? 'Ocultar' : 'Publicar'}</button><button type="button" onclick="removeDestination('${escapeHtml(item.id)}')" class="text-rose-300 font-bold ml-auto">Eliminar</button></div>
                    </div>
                </article>`).join('') : '<p class="text-sm text-slate-400">Aún no hay destinos.</p>'}
            </div>
        </section>`;
}

function setDestinationPreview(source) {
    const preview = document.getElementById('destination-preview');
    const icon = document.getElementById('destination-preview-icon');
    if (!preview) return;
    preview.classList.toggle('hidden', !source);
    icon?.classList.toggle('hidden', Boolean(source));
    if (source) preview.src = source;
}

function previewDestinationUrl(value) {
    extraState.pendingDestinationImage = '';
    setDestinationPreview(/^https:\/\//i.test(value) ? value : '');
}

function handleDestinationImage(input) {
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1.5 * 1024 * 1024) {
        input.value = '';
        showToast('Sube una foto JPG, PNG o WEBP de máximo 1.5 MB.', 'rose');
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        extraState.pendingDestinationImage = String(reader.result);
        setDestinationPreview(extraState.pendingDestinationImage);
    };
    reader.readAsDataURL(file);
}

function resetDestinationForm() {
    const form = document.getElementById('destination-form');
    if (!form) return;
    form.reset();
    form.elements.id.value = '';
    form.elements.order.value = destinations.length + 1;
    extraState.pendingDestinationImage = '';
    setDestinationPreview('');
}

function editDestination(destinationId) {
    const item = destinations.find(row => row.id === destinationId);
    const form = document.getElementById('destination-form');
    if (!item || !form) return;
    form.elements.id.value = item.id;
    form.elements.name.value = item.name;
    form.elements.slug.value = item.slug;
    form.elements.region.value = item.region;
    form.elements.order.value = item.order;
    form.elements.description.value = item.description;
    form.elements.keywords.value = item.keywords.join(', ');
    form.elements.imageUrl.value = item.imageUrl || '';
    form.elements.tourUrl.value = item.tourUrl || '';
    form.elements.tourIs360.checked = Boolean(item.tourIs360);
    form.elements.externalTourUrl.value = item.externalTourUrl || '';
    form.elements.externalTourLabel.value = item.externalTourLabel || '';
    form.elements.active.checked = item.active;
    extraState.pendingDestinationImage = '';
    setDestinationPreview(item.image);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function saveDestinationForm(form) {
    const id = form.elements.id.value;
    const existing = destinations.find(row => row.id === id);
    const pastedUrl = form.elements.imageUrl.value.trim();
    const tourUrl = form.elements.tourUrl.value.trim();
    const externalTourUrl = form.elements.externalTourUrl.value.trim();
    if (externalTourUrl && !/^https:\/\//i.test(externalTourUrl)) {
        showToast('El enlace del tour externo debe empezar con https://', 'rose');
        return;
    }
    if (tourUrl && !/^https:\/\//i.test(tourUrl)) {
        showToast('La URL de la foto 360° debe empezar con https://', 'rose');
        return;
    }
    if (pastedUrl && !/^https:\/\//i.test(pastedUrl)) {
        showToast('La URL de la imagen debe empezar con https://', 'rose');
        return;
    }
    const input = {
        id: id || undefined,
        slug: form.elements.slug.value.trim(),
        name: form.elements.name.value.trim(),
        region: form.elements.region.value.trim(),
        description: form.elements.description.value.trim(),
        keywords: form.elements.keywords.value.split(',').map(word => word.trim().toLowerCase()).filter(Boolean).slice(0, 20),
        order: Number(form.elements.order.value) || 0,
        active: form.elements.active.checked,
        tourUrl,
        tourIs360: form.elements.tourIs360.checked && Boolean(tourUrl),
        hasTourColumns: Boolean(existing?.hasTourColumns),
        externalTourUrl,
        externalTourLabel: form.elements.externalTourLabel.value.trim(),
        hasExternalColumns: Boolean(existing?.hasExternalColumns),
        imagePath: extraState.pendingDestinationImage || pastedUrl ? null : existing?.imagePath || null,
        imageUrl: pastedUrl || (extraState.pendingDestinationImage ? null : existing?.imageUrl || null)
    };
    try {
        const saved = await window.OrquideasStore.saveDestination(currentUser.id, input, extraState.pendingDestinationImage);
        destinations = existing ? destinations.map(row => row.id === saved.id ? saved : row) : [...destinations, saved];
        destinations.sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
        renderDestinationsTab();
        renderDestinationOptions();
        showToast('Destino guardado. Ya se muestra en la página principal.');
    } catch (error) {
        showToast(/duplicate key/i.test(error?.message || '') ? 'Ya existe un destino con ese identificador.' : friendlyError(error, 'No se pudo guardar el destino.'), 'rose');
    }
}

async function uploadDestinationTour(input) {
    const file = input.files?.[0];
    const form = document.getElementById('destination-form');
    const label = document.getElementById('tour-upload-label');
    if (!file || !form) return;
    label.textContent = 'Subiendo…';
    try {
        const url = await window.OrquideasStore.uploadTourImage(currentUser.id, file);
        form.elements.tourUrl.value = url;
        const size = await new Promise(resolve => {
            const image = new Image();
            image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
            image.onerror = () => resolve([0, 0]);
            image.src = URL.createObjectURL(file);
        });
        const ratio = size[1] ? size[0] / size[1] : 0;
        form.elements.tourIs360.checked = ratio > 1.9 && ratio < 2.1;
        showToast(form.elements.tourIs360.checked ? 'Foto 360° subida. Guarda el destino para publicarla.' : 'Foto subida como panorámica (no es 2:1). Guarda el destino.');
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo subir la foto 360°. ¿Ejecutaste database/visita_virtual.sql?'), 'rose');
    } finally {
        label.textContent = 'Subir foto 360° (JPG, máx. 15 MB)';
        input.value = '';
    }
}

// ---------- escenas 360° de un destino ----------
const sceneState = { destinationId: '', scenes: [] };

async function openSceneManager(destinationId) {
    const box = document.getElementById('scene-manager');
    const destination = destinations.find(item => item.id === destinationId);
    if (!box || !destination) return;
    sceneState.destinationId = destinationId;
    box.classList.remove('hidden');
    box.innerHTML = '<p class="text-sm text-slate-400">Cargando escenas…</p>';
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const scenes = await window.OrquideasStore.loadTourScenes(destinationId);
    if (scenes === null) {
        box.innerHTML = '<p class="text-sm text-amber-200">Ejecuta <b>database/visita_virtual.sql</b> en Supabase para crear tours por escenas.</p>';
        return;
    }
    sceneState.scenes = scenes;
    renderSceneManager();
}

function renderSceneManager() {
    const box = document.getElementById('scene-manager');
    const destination = destinations.find(item => item.id === sceneState.destinationId);
    if (!box || !destination) return;
    const scenes = sceneState.scenes;
    box.innerHTML = `
        <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div><h3 class="font-extrabold text-lg text-white">Escenas 360° · ${escapeHtml(destination.name)}</h3><p class="text-xs text-slate-400 mt-1">Cada escena es una foto 360° (proporción 2:1). Los visitantes pasan de una a otra como en un recorrido.</p></div>
            <div class="flex gap-2"><button type="button" onclick="openVirtualTour('${escapeHtml(destination.slug)}')" class="${BTN_SECONDARY}"><i class="fa-solid fa-eye mr-1" aria-hidden="true"></i>Ver tour</button><button type="button" onclick="document.getElementById('scene-manager').classList.add('hidden')" class="${BTN_SECONDARY}">Cerrar</button></div>
        </div>
        <form id="scene-form" onsubmit="event.preventDefault(); saveSceneForm(this);" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            <input type="hidden" name="id">
            <label class="text-xs text-slate-300">Nombre de la escena<input name="title" required minlength="2" maxlength="80" placeholder="Casa del Inca" class="${INPUT}"></label>
            <label class="text-xs text-slate-300">Orden<input name="order" type="number" value="${scenes.length + 1}" class="${INPUT}"></label>
            <label class="text-xs text-slate-300 sm:col-span-2">Descripción corta<input name="description" maxlength="300" class="${INPUT}"></label>
            <label class="text-xs text-slate-300 sm:col-span-2">Foto 360° (URL https)<input name="image" type="url" required maxlength="600" class="${INPUT}"></label>
            <label class="inline-flex items-center justify-center gap-2 cursor-pointer ${BTN_SECONDARY} self-end"><i class="fa-solid fa-upload" aria-hidden="true"></i><span id="scene-upload-label">Subir foto 360°</span><input type="file" accept="image/jpeg,image/webp" class="sr-only" onchange="uploadSceneImage(this)"></label>
            <label class="text-xs text-slate-300">Crédito / autor (opcional)<input name="credit" maxlength="160" class="${INPUT}"></label>
            <label class="text-xs text-slate-300 sm:col-span-2">Enlace del crédito (opcional)<input name="creditUrl" type="url" maxlength="500" class="${INPUT}"></label>
            <label class="text-xs text-slate-300">Ángulo inicial (−180 a 180°)<input name="yaw" type="number" min="-180" max="180" value="0" class="${INPUT}"></label>
            <label class="text-xs text-slate-300">Tipo de foto<select name="is360" class="${INPUT}"><option value="1">360° completa (esfera, proporción 2:1)</option><option value="0">Panorámica amplia</option></select></label>
            <label class="text-xs text-slate-300">Ángulo horizontal si es panorámica (°)<input name="haov" type="number" min="30" max="360" placeholder="Ej.: 180" class="${INPUT}"></label>
            <div class="flex items-end gap-2"><button type="button" onclick="document.getElementById('scene-form').reset(); document.getElementById('scene-form').elements.id.value='';" class="${BTN_SECONDARY}">Limpiar</button><button type="submit" class="${BTN_PRIMARY} flex-1"><i class="fa-solid fa-floppy-disk mr-2" aria-hidden="true"></i>Guardar escena</button></div>
        </form>
        ${scenes.length ? `<ol class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">${scenes.map(scene => `<li class="flex gap-3 bg-slate-900 border border-slate-700 rounded-xl p-2.5">
            <img src="${escapeHtml(scene.image.replace(/\/\d+px-/, '/1280px-'))}" alt="" loading="lazy" class="w-28 h-16 object-cover rounded-lg bg-slate-800 shrink-0">
            <div class="min-w-0 flex-1 text-xs">
                <p class="font-bold text-white truncate">${Number(scene.order)}. ${escapeHtml(scene.title)}</p>
                <p class="text-slate-400 truncate">${scene.is360 === false ? 'Panorámica' : '360°'} · ${escapeHtml(scene.credit || 'Foto propia')}</p>
                <div class="flex gap-3 mt-1.5"><button type="button" onclick="editScene('${escapeHtml(scene.id)}')" class="text-sky-300 font-bold">Editar</button><button type="button" onclick="removeScene('${escapeHtml(scene.id)}')" class="text-rose-300 font-bold">Eliminar</button></div>
            </div>
        </li>`).join('')}</ol>` : '<p class="text-sm text-slate-400">Este destino aún no tiene escenas. Mientras tanto se muestra la vista panorámica.</p>'}`;
}

async function uploadSceneImage(input) {
    const file = input.files?.[0];
    const form = document.getElementById('scene-form');
    const label = document.getElementById('scene-upload-label');
    if (!file || !form) return;
    label.textContent = 'Subiendo…';
    try {
        form.elements.image.value = await window.OrquideasStore.uploadTourImage(currentUser.id, file);
        showToast('Foto subida. Completa el nombre y guarda la escena.');
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo subir la foto 360°.'), 'rose');
    } finally {
        label.textContent = 'Subir foto 360°';
        input.value = '';
    }
}

function editScene(sceneId) {
    const scene = sceneState.scenes.find(item => item.id === sceneId);
    const form = document.getElementById('scene-form');
    if (!scene || !form) return;
    Object.entries({ id: scene.id, title: scene.title, order: scene.order, description: scene.description, image: scene.image, credit: scene.credit, creditUrl: scene.creditUrl, yaw: scene.yaw, is360: scene.is360 === false ? '0' : '1', haov: scene.haov || '' })
        .forEach(([name, value]) => { form.elements[name].value = value ?? ''; });
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function saveSceneForm(form) {
    const image = form.elements.image.value.trim();
    const creditUrl = form.elements.creditUrl.value.trim();
    if (!/^https:\/\//i.test(image) || (creditUrl && !/^https:\/\//i.test(creditUrl))) {
        showToast('Los enlaces deben empezar con https://', 'rose');
        return;
    }
    try {
        const saved = await window.OrquideasStore.saveTourScene({
            id: form.elements.id.value || undefined,
            destinationId: sceneState.destinationId,
            title: form.elements.title.value.trim(),
            description: form.elements.description.value.trim(),
            image,
            credit: form.elements.credit.value.trim(),
            creditUrl,
            yaw: Number(form.elements.yaw.value) || 0,
            order: Number(form.elements.order.value) || 0,
            is360: form.elements.is360.value === '1',
            haov: Number(form.elements.haov.value) || 0
        });
        const exists = sceneState.scenes.some(item => item.id === saved.id);
        sceneState.scenes = (exists ? sceneState.scenes.map(item => item.id === saved.id ? saved : item) : [...sceneState.scenes, saved]).sort((a, b) => a.order - b.order);
        renderSceneManager();
        showToast('Escena guardada.');
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo guardar la escena.'), 'rose');
    }
}

async function removeScene(sceneId) {
    if (!confirm('¿Eliminar esta escena del tour?')) return;
    try {
        await window.OrquideasStore.deleteTourScene(sceneId);
        sceneState.scenes = sceneState.scenes.filter(item => item.id !== sceneId);
        renderSceneManager();
        showToast('Escena eliminada.');
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo eliminar la escena.'), 'rose');
    }
}

async function toggleDestination(destinationId) {
    const item = destinations.find(row => row.id === destinationId);
    if (!item) return;
    try {
        const saved = await window.OrquideasStore.saveDestination(currentUser.id, { ...item, active: !item.active }, '');
        destinations = destinations.map(row => row.id === saved.id ? saved : row);
        renderDestinationsTab();
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo actualizar el destino.'), 'rose');
    }
}

async function removeDestination(destinationId) {
    const item = destinations.find(row => row.id === destinationId);
    if (!item || !confirm(`¿Eliminar el destino "${item.name}"? Los paquetes no se borran.`)) return;
    try {
        await window.OrquideasStore.deleteDestination(destinationId);
        destinations = destinations.filter(row => row.id !== destinationId);
        renderDestinationsTab();
        renderDestinationOptions();
        showToast('Destino eliminado.');
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo eliminar el destino.'), 'rose');
    }
}

// ---------- equipo: usuarios y roles (solo dueño) ----------
function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const values = crypto.getRandomValues(new Uint32Array(12));
    return Array.from(values, value => chars[value % chars.length]).join('') + '#' + (values[0] % 90 + 10);
}

function renderTeamTab() {
    const tab = document.getElementById('admin-tab-equipo');
    if (!tab) return;
    const staffRoles = Object.fromEntries(Object.entries(ROLE_LABELS));
    const helperRoles = Object.fromEntries(Object.entries(ROLE_LABELS).filter(([key]) => key !== 'admin'));
    tab.innerHTML = `
        <section class="${CARD}">
            <h3 class="font-extrabold text-lg text-white mb-1">Crear cuenta para un ayudante</h3>
            <p class="text-xs text-slate-400 mb-4">La cuenta queda activa al instante. Entrégale el correo y la contraseña en persona o por un canal privado.</p>
            <form onsubmit="event.preventDefault(); createStaffAccount(this);" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" autocomplete="off">
                <label class="text-xs text-slate-300">Nombres<input name="firstName" required maxlength="60" class="${INPUT}"></label>
                <label class="text-xs text-slate-300">Apellidos<input name="lastName" required maxlength="60" class="${INPUT}"></label>
                <label class="text-xs text-slate-300">Rol<select name="role" class="${INPUT}">${optionList(helperRoles, 'cajero')}</select></label>
                <label class="text-xs text-slate-300">Correo<input name="email" type="email" required maxlength="150" autocomplete="off" class="${INPUT}"></label>
                <label class="text-xs text-slate-300">Contraseña (mín. 10 caracteres)
                    <div class="flex gap-2"><input name="password" type="text" required minlength="10" maxlength="72" autocomplete="new-password" class="${INPUT}"><button type="button" onclick="this.previousElementSibling.value = generatePassword()" class="mt-1 ${BTN_SECONDARY} whitespace-nowrap" title="Generar contraseña segura"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i></button></div>
                </label>
                <div class="flex items-end"><button type="submit" class="${BTN_PRIMARY} w-full"><i class="fa-solid fa-user-plus mr-2" aria-hidden="true"></i>Crear cuenta</button></div>
            </form>
        </section>
        <section class="${CARD}">
            <h3 class="font-extrabold text-lg text-white mb-1">Dar acceso a una cuenta existente</h3>
            <p class="text-xs text-slate-400 mb-4">Si la persona ya se registró en la web como cliente, asígnale un rol con su correo.</p>
            <form onsubmit="event.preventDefault(); assignRoleByEmail(this);" class="grid grid-cols-1 sm:grid-cols-[1fr_220px_auto] gap-4 items-end">
                <label class="text-xs text-slate-300">Correo de la cuenta<input name="email" type="email" required class="${INPUT}"></label>
                <label class="text-xs text-slate-300">Rol<select name="role" class="${INPUT}">${optionList(staffRoles, 'cajero')}</select></label>
                <button type="submit" class="${BTN_PRIMARY}">Asignar rol</button>
            </form>
        </section>
        <section class="${CARD}">
            <h3 class="font-extrabold text-lg text-white mb-4">Equipo con acceso al panel</h3>
            <div class="overflow-x-auto"><table class="w-full min-w-[760px] text-left text-xs text-slate-300">
                <thead class="bg-slate-900 text-slate-400 uppercase"><tr><th class="p-3">Nombre</th><th class="p-3">Correo</th><th class="p-3">Rol</th><th class="p-3">Último ingreso</th><th class="p-3 text-right">Acciones</th></tr></thead>
                <tbody class="divide-y divide-slate-700/50">${extraState.staff.length ? extraState.staff.map(member => {
                    const self = member.user_id === currentUser.id;
                    const id = escapeHtml(member.user_id);
                    return `<tr>
                        <td class="p-3 text-white font-semibold">${escapeHtml(member.full_name || '—')}${self ? ' <span class="text-brand-400">(tú)</span>' : ''}</td>
                        <td class="p-3 break-all">${escapeHtml(member.email)}${member.email_confirmed ? '' : ' <span class="text-amber-300">(sin activar)</span>'}</td>
                        <td class="p-3">${self ? escapeHtml(ROLE_LABELS[member.role] || member.role) : `<select onchange="changeStaffRole('${id}', this.value)" class="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white">${optionList(staffRoles, member.role)}</select>`}</td>
                        <td class="p-3">${member.last_sign_in_at ? escapeHtml(new Date(member.last_sign_in_at).toLocaleString('es-PE')) : 'Nunca'}</td>
                        <td class="p-3 text-right whitespace-nowrap">${self ? '' : `
                            ${member.email_confirmed ? '' : `<button type="button" onclick="activateStaff('${id}')" class="text-emerald-300 font-bold mr-3">Activar</button>`}
                            <button type="button" onclick="resetStaffPassword('${id}')" class="text-sky-300 font-bold mr-3">Nueva contraseña</button>
                            <button type="button" onclick="changeStaffRole('${id}', 'client')" class="text-rose-300 font-bold">Quitar acceso</button>`}</td>
                    </tr>`;
                }).join('') : emptyRow(5, 'Aún no hay miembros del equipo.')}</tbody>
            </table></div>
        </section>
        <section class="${CARD}">
            <h3 class="font-extrabold text-white mb-3">¿Qué puede hacer cada rol?</h3>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">${Object.entries(ROLE_DESCRIPTIONS).map(([role, text]) => `<div class="bg-slate-900 border border-slate-700 rounded-lg p-3"><dt class="font-bold text-white">${escapeHtml(ROLE_LABELS[role])}</dt><dd class="text-slate-400 mt-1">${escapeHtml(text)}</dd></div>`).join('')}</dl>
        </section>`;
}

async function refreshStaff() {
    try {
        extraState.staff = await query(window.supabaseClient.rpc('admin_list_staff'));
        await loadPeopleNames();
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo cargar el equipo.'), 'rose');
    }
    renderTeamTab();
}

async function createStaffAccount(form) {
    const button = form.querySelector('[type="submit"]');
    const email = form.elements.email.value.trim().toLowerCase();
    const password = form.elements.password.value;
    const role = form.elements.role.value;
    if (password.length < 10) {
        showToast('Usa una contraseña de al menos 10 caracteres.', 'rose');
        return;
    }
    button.disabled = true;
    button.textContent = 'Creando...';
    try {
        // Cliente temporal sin sesión: no reemplaza la sesión del dueño.
        const config = window.OrquideasSupabase;
        const tempClient = window.supabase.createClient(config.url, config.publishableKey, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'orquidea-staff-signup' }
        });
        const firstName = form.elements.firstName.value.trim();
        const lastName = form.elements.lastName.value.trim();
        const { data, error } = await tempClient.auth.signUp({ email, password, options: { data: { first_name: firstName, last_name: lastName, full_name: `${firstName} ${lastName}` } } });
        if (error) throw error;
        if (!data.user || (Array.isArray(data.user.identities) && data.user.identities.length === 0)) {
            throw new Error('Ese correo ya tiene una cuenta. Usa "Dar acceso a una cuenta existente".');
        }
        await query(window.supabaseClient.rpc('admin_set_user_role', { target_user: data.user.id, new_role: role }));
        await query(window.supabaseClient.rpc('admin_confirm_user_email', { target_user: data.user.id }));
        await tempClient.auth.signOut().catch(() => {});
        form.reset();
        showToast(`Cuenta creada para ${email} como ${ROLE_LABELS[role]}.`);
        await refreshStaff();
    } catch (error) {
        showToast(/rate limit/i.test(error?.message || '') ? 'Supabase limita los registros por hora. Intenta en unos minutos.' : friendlyError(error, 'No se pudo crear la cuenta.'), 'rose');
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fa-solid fa-user-plus mr-2" aria-hidden="true"></i>Crear cuenta';
    }
}

async function assignRoleByEmail(form) {
    const email = form.elements.email.value.trim().toLowerCase();
    try {
        const rows = await query(window.supabaseClient.from('profiles').select('user_id').ilike('email', email).limit(1));
        if (!rows.length) throw new Error('No existe una cuenta con ese correo.');
        await query(window.supabaseClient.rpc('admin_set_user_role', { target_user: rows[0].user_id, new_role: form.elements.role.value }));
        form.reset();
        showToast('Rol asignado.');
        await refreshStaff();
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo asignar el rol.'), 'rose');
    }
}

async function changeStaffRole(userId, role) {
    const member = extraState.staff.find(row => row.user_id === userId);
    const message = role === 'client' ? `¿Quitar el acceso al panel a ${member?.full_name || 'esta persona'}? Su cuenta quedará como cliente.` : `¿Cambiar el rol de ${member?.full_name || 'esta persona'} a ${ROLE_LABELS[role]}?`;
    if (!confirm(message)) {
        renderTeamTab();
        return;
    }
    try {
        await query(window.supabaseClient.rpc('admin_set_user_role', { target_user: userId, new_role: role }));
        showToast('Permisos actualizados. Se aplican en su próximo ingreso o al recargar.');
        await refreshStaff();
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo actualizar el rol.'), 'rose');
        renderTeamTab();
    }
}

async function activateStaff(userId) {
    try {
        await query(window.supabaseClient.rpc('admin_confirm_user_email', { target_user: userId }));
        showToast('Cuenta activada.');
        await refreshStaff();
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo activar la cuenta.'), 'rose');
    }
}

async function resetStaffPassword(userId) {
    const member = extraState.staff.find(row => row.user_id === userId);
    const suggested = generatePassword();
    const password = prompt(`Nueva contraseña para ${member?.full_name || member?.email} (mín. 10 caracteres). Se sugiere una segura:`, suggested);
    if (password === null) return;
    if (password.length < 10) {
        showToast('La contraseña debe tener al menos 10 caracteres.', 'rose');
        return;
    }
    try {
        await query(window.supabaseClient.rpc('admin_set_user_password', { target_user: userId, new_password: password }));
        showToast('Contraseña actualizada. Entrégala por un canal privado.');
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo cambiar la contraseña.'), 'rose');
    }
}

// ---------- personal (RR.HH.) ----------
function renderPersonnelTab() {
    const tab = document.getElementById('admin-tab-personal');
    if (!tab) return;
    const filter = document.getElementById('employee-filter')?.value ?? 'activos';
    const rows = extraState.employees.filter(row => filter === 'todos' || (filter === 'activos' ? row.status !== 'cesado' : row.status === filter));
    const active = extraState.employees.filter(row => row.status !== 'cesado');
    tab.innerHTML = `
        <section class="${CARD}">
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                ${statCard('Personal activo', active.length)}
                ${statCard('Planilla mensual', money(active.reduce((sum, row) => sum + Number(row.salary), 0)), 'emerald')}
                ${statCard('De vacaciones', extraState.employees.filter(row => row.status === 'vacaciones').length, 'sky')}
                ${statCard('Con licencia', extraState.employees.filter(row => row.status === 'licencia').length, 'amber')}
            </div>
            <h3 class="font-extrabold text-lg text-white mb-4">Ficha de trabajador</h3>
            <form id="employee-form" onsubmit="event.preventDefault(); saveEmployee(this);" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <input type="hidden" name="id">
                <label class="text-xs text-slate-300 sm:col-span-2">Nombre completo<input name="fullName" required minlength="3" maxlength="150" class="${INPUT}"></label>
                <label class="text-xs text-slate-300">DNI<input name="document" maxlength="20" class="${INPUT}"></label>
                <label class="text-xs text-slate-300">Fecha de ingreso<input name="hireDate" type="date" value="${limaToday()}" required class="${INPUT}"></label>
                <label class="text-xs text-slate-300">Cargo<input name="position" required maxlength="80" class="${INPUT}"></label>
                <label class="text-xs text-slate-300">Área<input name="area" required maxlength="80" value="Operaciones" class="${INPUT}"></label>
                <label class="text-xs text-slate-300">Sueldo mensual (S/)<input name="salary" type="number" min="0" step="0.01" value="0" class="${INPUT}"></label>
                <label class="text-xs text-slate-300">Estado<select name="status" class="${INPUT}">${optionList(EMPLOYEE_STATUS, 'activo')}</select></label>
                <label class="text-xs text-slate-300">Teléfono<input name="phone" type="tel" maxlength="20" class="${INPUT}"></label>
                <label class="text-xs text-slate-300">Correo<input name="email" type="email" maxlength="150" class="${INPUT}"></label>
                <label class="text-xs text-slate-300 sm:col-span-2">Notas<input name="notes" maxlength="1000" class="${INPUT}"></label>
                <div class="flex gap-2 sm:col-span-2 xl:col-span-4 justify-end">
                    <button type="button" onclick="document.getElementById('employee-form').reset(); document.getElementById('employee-form').elements.id.value='';" class="${BTN_SECONDARY}">Limpiar</button>
                    <button type="submit" class="${BTN_PRIMARY}"><i class="fa-solid fa-floppy-disk mr-2" aria-hidden="true"></i>Guardar ficha</button>
                </div>
            </form>
        </section>
        <section class="${CARD}">
            <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
                <h3 class="font-extrabold text-lg text-white">Personal</h3>
                <div class="flex gap-2 items-end">
                    <label class="text-xs text-slate-300">Mostrar<select id="employee-filter" onchange="renderPersonnelTab()" class="${INPUT}"><option value="activos" ${filter === 'activos' ? 'selected' : ''}>Activos</option><option value="todos" ${filter === 'todos' ? 'selected' : ''}>Todos</option>${optionList(EMPLOYEE_STATUS, filter)}</select></label>
                    <button type="button" onclick="exportEmployees()" class="${BTN_SECONDARY}"><i class="fa-solid fa-file-csv mr-1" aria-hidden="true"></i>CSV</button>
                </div>
            </div>
            <div class="overflow-x-auto"><table class="w-full min-w-[760px] text-left text-xs text-slate-300">
                <thead class="bg-slate-900 text-slate-400 uppercase"><tr><th class="p-3">Nombre</th><th class="p-3">Cargo / Área</th><th class="p-3">Ingreso</th><th class="p-3">Sueldo</th><th class="p-3">Contacto</th><th class="p-3">Estado</th><th class="p-3 text-right"></th></tr></thead>
                <tbody class="divide-y divide-slate-700/50">${rows.length ? rows.map(row => `<tr>
                    <td class="p-3 text-white font-semibold">${escapeHtml(row.full_name)}${row.user_id ? ' <i class="fa-solid fa-user-shield text-brand-400" title="Tiene cuenta en el panel" aria-label="Tiene cuenta en el panel"></i>' : ''}<span class="block text-slate-500 font-normal">${escapeHtml(row.document_number || '')}</span></td>
                    <td class="p-3">${escapeHtml(row.position)}<span class="block text-slate-500">${escapeHtml(row.area)}</span></td>
                    <td class="p-3">${escapeHtml(formatDate(row.hire_date))}</td>
                    <td class="p-3 font-bold">${money(row.salary)}</td>
                    <td class="p-3">${escapeHtml(row.phone || '—')}<span class="block text-slate-500 break-all">${escapeHtml(row.email || '')}</span></td>
                    <td class="p-3">${escapeHtml(EMPLOYEE_STATUS[row.status] || row.status)}</td>
                    <td class="p-3 text-right whitespace-nowrap"><button type="button" onclick="editEmployee('${escapeHtml(row.id)}')" class="text-sky-300 font-bold mr-3">Editar</button>${hasRole('admin') && !row.user_id ? `<button type="button" onclick="deleteEmployee('${escapeHtml(row.id)}')" class="text-rose-300 font-bold">Eliminar</button>` : ''}</td>
                </tr>`).join('') : emptyRow(7, 'Sin personal en este filtro.')}</tbody>
            </table></div>
        </section>`;
}

function editEmployee(employeeId) {
    const row = extraState.employees.find(item => item.id === employeeId);
    const form = document.getElementById('employee-form');
    if (!row || !form) return;
    Object.entries({ id: row.id, fullName: row.full_name, document: row.document_number || '', hireDate: row.hire_date, position: row.position, area: row.area, salary: row.salary, status: row.status, phone: row.phone || '', email: row.email || '', notes: row.notes || '' })
        .forEach(([name, value]) => { form.elements[name].value = value; });
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function saveEmployee(form) {
    const id = form.elements.id.value;
    const values = {
        full_name: form.elements.fullName.value.trim(),
        document_number: form.elements.document.value.trim() || null,
        hire_date: form.elements.hireDate.value,
        position: form.elements.position.value.trim(),
        area: form.elements.area.value.trim(),
        salary: Number(form.elements.salary.value) || 0,
        status: form.elements.status.value,
        phone: form.elements.phone.value.trim() || null,
        email: form.elements.email.value.trim() || null,
        notes: form.elements.notes.value.trim() || null,
        updated_at: new Date().toISOString()
    };
    try {
        const builder = id ? window.supabaseClient.from('employees').update(values).eq('id', id) : window.supabaseClient.from('employees').insert(values);
        const row = await query(builder.select('*').single());
        extraState.employees = id ? extraState.employees.map(item => item.id === id ? row : item) : [...extraState.employees, row].sort((a, b) => a.full_name.localeCompare(b.full_name));
        if (row.user_id) extraState.names[row.user_id] = row.full_name;
        renderPersonnelTab();
        showToast('Ficha guardada.');
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo guardar la ficha.'), 'rose');
    }
}

async function deleteEmployee(employeeId) {
    if (!confirm('¿Eliminar esta ficha? Para personal que dejó la empresa es mejor marcarlo como "Cesado".')) return;
    try {
        await query(window.supabaseClient.from('employees').delete().eq('id', employeeId));
        extraState.employees = extraState.employees.filter(row => row.id !== employeeId);
        renderPersonnelTab();
        showToast('Ficha eliminada.');
    } catch (error) {
        showToast(friendlyError(error, 'No se pudo eliminar la ficha.'), 'rose');
    }
}

function exportEmployees() {
    downloadCsv(`personal-${limaToday()}.csv`, ['Nombre', 'DNI', 'Cargo', 'Área', 'Ingreso', 'Sueldo', 'Estado', 'Teléfono', 'Correo'],
        extraState.employees.map(row => [row.full_name, row.document_number || '', row.position, row.area, row.hire_date, Number(row.salary).toFixed(2), EMPLOYEE_STATUS[row.status] || row.status, row.phone || '', row.email || '']));
}

// ---------- auditoría (dueño) ----------
function injectAuditSection() {
    const tab = document.getElementById('admin-tab-historial');
    if (!tab || document.getElementById('audit-section')) return;
    const section = document.createElement('section');
    section.id = 'audit-section';
    section.className = CARD;
    tab.prepend(section);
    renderAudit();
}

function auditDetail(row) {
    const data = row.summary || {};
    if (row.table_name === 'bookings' && data.previous_status && data.previous_status !== data.status) return `Estado: ${data.previous_status} → ${data.status}`;
    if (row.table_name === 'payments') return `${money(data.amount)} · ${PAYMENT_METHODS[data.method] || data.method || ''}`;
    if (row.table_name === 'expenses') return `${money(data.amount)} · ${EXPENSE_CATEGORIES[data.category] || ''}`;
    if (row.table_name === 'user_roles') return `Rol: ${ROLE_LABELS[data.role] || data.role}`;
    if (row.table_name === 'packages') return `Precio ${money(data.price)} · cupos ${data.available_spots ?? ''}`;
    if (data.status) return `Estado: ${data.status}`;
    return '';
}

function renderAudit() {
    const section = document.getElementById('audit-section');
    if (!section) return;
    const module = document.getElementById('audit-module')?.value || '';
    const person = (document.getElementById('audit-person')?.value || '').toLowerCase();
    const rows = extraState.audit.filter(row => (!module || row.table_name === module) && (!person || (row.actor_email || '').toLowerCase().includes(person)));
    section.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
            <div><h3 class="font-extrabold text-lg text-white">Auditoría: quién hizo qué</h3><p class="text-xs text-slate-400 mt-1">Registro automático e inalterable de los últimos 300 cambios.</p></div>
            <div class="flex flex-wrap gap-2 items-end">
                <label class="text-xs text-slate-300">Módulo<select id="audit-module" onchange="renderAudit()" class="${INPUT}"><option value="">Todos</option>${optionList(AUDIT_TABLES, module)}</select></label>
                <label class="text-xs text-slate-300">Usuario<input id="audit-person" type="search" value="${escapeHtml(person)}" oninput="renderAudit()" placeholder="correo" class="${INPUT}"></label>
            </div>
        </div>
        <div class="overflow-x-auto"><table class="w-full min-w-[720px] text-left text-xs text-slate-300">
            <thead class="bg-slate-900 text-slate-400 uppercase"><tr><th class="p-3">Fecha</th><th class="p-3">Usuario</th><th class="p-3">Acción</th><th class="p-3">Módulo</th><th class="p-3">Registro</th><th class="p-3">Detalle</th></tr></thead>
            <tbody class="divide-y divide-slate-700/50">${rows.length ? rows.map(row => `<tr><td class="p-3 text-slate-400 whitespace-nowrap">${escapeHtml(new Date(row.created_at).toLocaleString('es-PE'))}</td><td class="p-3 text-white break-all">${escapeHtml(row.actor_email || (row.actor ? personName(row.actor) : 'Sistema / cliente'))}</td><td class="p-3 font-bold ${row.action === 'DELETE' ? 'text-rose-300' : row.action === 'INSERT' ? 'text-emerald-300' : 'text-sky-300'}">${escapeHtml(AUDIT_ACTIONS[row.action] || row.action)}</td><td class="p-3">${escapeHtml(AUDIT_TABLES[row.table_name] || row.table_name)}</td><td class="p-3 font-mono text-brand-400 break-all">${escapeHtml(String(row.record_id || '').slice(0, 40))}</td><td class="p-3">${escapeHtml(auditDetail(row))}</td></tr>`).join('') : emptyRow(6, 'Sin movimientos registrados.')}</tbody>
        </table></div>`;
}

// ---------- enrutador de pestañas nuevas ----------
function renderAdminExtraTab(tab) {
    const renderers = {
        caja: renderCashTab,
        gastos: renderExpensesTab,
        finanzas: renderFinanceTab,
        destinos: renderDestinationsTab,
        equipo: renderTeamTab,
        personal: renderPersonnelTab,
        asistencia: renderAttendanceTab,
        dash: renderDashboardExtras,
        historial: renderAudit
    };
    renderers[tab]?.();
}

// ---------- seguridad: cierre de sesión por inactividad (30 min) ----------
(() => {
    const LIMIT_MS = 30 * 60 * 1000;
    let timer = null;
    const reset = () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            try { await window.supabaseClient?.auth.signOut(); } catch (error) { console.warn(error); }
            window.location.replace('login.html');
        }, LIMIT_MS);
    };
    ['click', 'keydown', 'touchstart', 'scroll'].forEach(eventName => document.addEventListener(eventName, reset, { passive: true }));
    reset();
})();
