(() => {
    const form = document.getElementById('complaint-form');
    const message = document.getElementById('form-message');
    const business = window.OrquideasConfig?.business || {};

    document.getElementById('today').textContent = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
    const info = [business.legalName || business.tradeName, business.ruc ? `RUC ${business.ruc}` : '', business.address].filter(Boolean).join(' · ');
    if (info) document.getElementById('business-info').textContent = info;

    const minorCheckbox = form.elements.is_minor;
    const guardianField = document.getElementById('guardian-field');
    minorCheckbox.addEventListener('change', () => {
        guardianField.classList.toggle('hidden', !minorCheckbox.checked);
        form.elements.guardian_name.required = minorCheckbox.checked;
    });

    function showMessage(text) {
        message.textContent = text;
        message.className = 'rounded-lg px-4 py-3 text-sm bg-rose-50 text-rose-800 border border-rose-200';
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.checkValidity()) {
            const invalid = form.querySelector(':invalid');
            invalid?.focus();
            showMessage('Completa los campos obligatorios (*) correctamente.');
            return;
        }
        const values = Object.fromEntries(new FormData(form).entries());
        const payload = {
            kind: values.kind,
            consumer_name: values.consumer_name,
            document_type: values.document_type,
            document_number: values.document_number,
            address: values.address,
            phone: values.phone || '',
            email: values.email,
            is_minor: minorCheckbox.checked,
            guardian_name: minorCheckbox.checked ? values.guardian_name : '',
            good_type: values.good_type,
            claimed_amount: values.claimed_amount || '',
            good_description: values.good_description,
            detail: values.detail,
            request: values.request
        };
        const button = form.querySelector('[type="submit"]');
        button.disabled = true;
        button.textContent = 'Enviando...';
        try {
            const { data, error } = await window.supabaseClient.rpc('submit_complaint', { payload });
            if (error) throw error;
            form.classList.add('hidden');
            message.classList.add('hidden');
            document.getElementById('complaint-code').textContent = data;
            const success = document.getElementById('complaint-success');
            success.classList.remove('hidden');
            success.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error(error);
            showMessage('No se pudo registrar tu reclamación. Inténtalo nuevamente o escríbenos a ' + (business.email || 'nuestro correo') + '.');
            button.disabled = false;
            button.textContent = 'Enviar reclamación';
        }
    });
})();
