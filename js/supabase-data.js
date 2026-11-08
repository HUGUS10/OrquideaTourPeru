(() => {
    const client = window.supabaseClient;
    const statusToUi = { pending: 'PENDIENTE', confirmed: 'CONFIRMADA', cancelled: 'CANCELADA', rejected: 'CANCELADA', completed: 'FINALIZADA' };
    const statusToDb = { PENDIENTE: 'pending', CONFIRMADA: 'confirmed', CANCELADA: 'cancelled', RECHAZADA: 'rejected', FINALIZADA: 'completed' };

    function throwIfError(result) {
        if (result.error) throw result.error;
        return result.data;
    }

    function mapPackage(row) {
        const image = fixPhoto(row.image_url) || (row.image_path ? client.storage.from('package-images').getPublicUrl(row.image_path).data.publicUrl : '');
        return {
            id: row.id,
            name: row.name,
            destination: row.destination,
            duration: row.duration,
            description: row.description,
            price: Number(row.price),
            stock: row.available_spots,
            image,
            imagePath: row.image_path,
            imageUrl: row.image_url,
            includes: row.services_included || [],
            excludes: row.services_excluded || [],
            active: row.is_published
        };
    }

    function mapBooking(row) {
        return {
            id: row.id,
            code: row.booking_code,
            userId: row.user_id,
            customer: row.customer_name || '',
            email: row.customer_email || '',
            packageId: row.package_id,
            packageName: row.package_name,
            date: row.travel_date,
            passengers: row.passenger_count,
            price: Number(row.unit_price),
            total: Number(row.total),
            status: statusToUi[row.status] || 'PENDIENTE',
            createdAt: row.created_at
        };
    }

    function mapPromotion(row) {
        return {
            id: row.id,
            packageId: row.package_id,
            title: row.title,
            discount: Number(row.discount_percent),
            startsOn: row.starts_on,
            endsOn: row.ends_on,
            active: row.is_active
        };
    }

    function mapReceipt(row) {
        return {
            id: row.receipt_number,
            receiptId: row.id,
            type: row.kind === 'factura' ? 'FACTURA' : 'BOLETA',
            bookingId: row.booking_id,
            bookingCode: row.bookings?.booking_code || '',
            packageName: row.bookings?.package_name || '',
            customer: row.buyer_name,
            email: row.customer_email || '',
            businessName: row.business_name || '',
            ruc: row.ruc || '',
            date: row.issued_at.slice(0, 10),
            subtotal: Number(row.subtotal),
            tax: Number(row.tax),
            total: Number(row.total)
        };
    }

    function mapComplaint(row) {
        return {
            id: row.id,
            code: row.complaint_code,
            kind: row.kind,
            name: row.consumer_name,
            documentType: row.document_type,
            documentNumber: row.document_number,
            address: row.address,
            phone: row.phone || '',
            email: row.email,
            isMinor: row.is_minor,
            guardian: row.guardian_name || '',
            goodType: row.good_type,
            amount: row.claimed_amount === null ? null : Number(row.claimed_amount),
            goodDescription: row.good_description,
            detail: row.detail,
            request: row.request,
            status: row.status,
            response: row.response || '',
            respondedAt: row.responded_at,
            createdAt: row.created_at
        };
    }

    async function loadComplaints() {
        const result = await client.from('complaints').select('*').order('created_at', { ascending: false });
        if (result.error) {
            console.warn('Libro de reclamaciones no disponible (ejecuta database/libro_reclamaciones.sql):', result.error.message);
            return [];
        }
        return result.data.map(mapComplaint);
    }

    async function updateComplaint(complaintId, values) {
        const result = await client.from('complaints').update(values).eq('id', complaintId).select('*').single();
        return mapComplaint(throwIfError(result));
    }

    async function submitComplaint(payload) {
        const result = await client.rpc('submit_complaint', { payload });
        return throwIfError(result);
    }

    async function currentRole(userId) {
        const result = await client.from('user_roles').select('role').eq('user_id', userId);
        const roles = throwIfError(result).map(record => record.role);
        return ['admin', 'cajero', 'agente', 'rrhh', 'atencion'].find(role => roles.includes(role)) || 'client';
    }

    // Fotos antiguas que no correspondían al lugar → reemplazo por fotos reales libres.
    const W = 'https://upload.wikimedia.org/wikipedia/commons/thumb/';
    const PHOTO_FIXES = {
        '1589553416260-f586c8f1514f': W + '7/7a/Colca_Valley_Panorama.jpg/1280px-Colca_Valley_Panorama.jpg',
        '1509316975850-ff9c5deb0cd9': W + 'b/b8/Vista_panor%C3%A0mica_de_Huacachina.jpg/1280px-Vista_panor%C3%A0mica_de_Huacachina.jpg',
        '1544735716-392fe2489ffa': W + 'c/c7/Islas_flotantes_de_los_Uros%2C_Lago_Titicaca%2C_Per%C3%BA%2C_2015-08-01%2C_DD_44-48_PAN.jpg/1280px-Islas_flotantes_de_los_Uros%2C_Lago_Titicaca%2C_Per%C3%BA%2C_2015-08-01%2C_DD_44-48_PAN.jpg'
    };
    function fixPhoto(url) {
        const key = Object.keys(PHOTO_FIXES).find(id => String(url || '').includes(id));
        return key ? PHOTO_FIXES[key] : url;
    }

    function mapDestination(row) {
        const image = fixPhoto(row.image_url) || (row.image_path ? client.storage.from('package-images').getPublicUrl(row.image_path).data.publicUrl : '');
        return {
            id: row.id,
            slug: row.slug,
            name: row.name,
            region: row.region || '',
            description: row.description || '',
            keywords: row.keywords || [],
            image,
            imagePath: row.image_path,
            imageUrl: row.image_url,
            order: row.sort_order,
            active: row.is_published,
            tourUrl: row.tour_url || '',
            tourIs360: Boolean(row.tour_is_360),
            hasTourColumns: 'tour_url' in row,
            externalTourUrl: row.external_tour_url || '',
            externalTourLabel: row.external_tour_label || '',
            hasExternalColumns: 'external_tour_url' in row
        };
    }

    async function loadDestinations() {
        const result = await client.from('destinations').select('*').order('sort_order').order('name');
        if (result.error) {
            console.warn('Destinos no disponibles (ejecuta database/equipo_y_finanzas.sql):', result.error.message);
            return null;
        }
        return result.data.map(mapDestination);
    }

    async function saveDestination(userId, destination, imageDataUrl) {
        let imagePath = destination.imagePath || null;
        let imageUrl = destination.imageUrl || null;
        if (imageDataUrl?.startsWith('data:image/')) {
            imagePath = (await uploadDataUrl('package-images', userId, imageDataUrl)).path;
            imageUrl = null;
        }
        const values = {
            slug: destination.slug,
            name: destination.name,
            region: destination.region,
            description: destination.description,
            keywords: destination.keywords,
            image_path: imagePath,
            image_url: imageUrl,
            sort_order: destination.order,
            is_published: destination.active,
            updated_at: new Date().toISOString()
        };
        if (destination.hasTourColumns || destination.tourUrl) {
            values.tour_url = destination.tourUrl || null;
            values.tour_is_360 = Boolean(destination.tourIs360);
        }
        if (destination.hasExternalColumns || destination.externalTourUrl) {
            values.external_tour_url = destination.externalTourUrl || null;
            values.external_tour_label = destination.externalTourLabel || null;
        }
        if (destination.id) values.id = destination.id;
        const result = await client.from('destinations').upsert(values).select('*').single();
        return mapDestination(throwIfError(result));
    }

    async function uploadTourImage(userId, file) {
        if (!['image/jpeg', 'image/webp'].includes(file.type)) throw new Error('La foto 360° debe ser JPG o WEBP.');
        if (file.size > 15 * 1024 * 1024) throw new Error('La foto 360° no debe superar los 15 MB.');
        const path = `${userId}/${crypto.randomUUID()}.${file.type === 'image/webp' ? 'webp' : 'jpg'}`;
        throwIfError(await client.storage.from('tour-images').upload(path, file, { contentType: file.type, upsert: false }));
        return client.storage.from('tour-images').getPublicUrl(path).data.publicUrl;
    }

    function mapScene(row) {
        return {
            id: row.id,
            destinationId: row.destination_id,
            title: row.title,
            description: row.description || '',
            image: row.image_url,
            credit: row.credit || '',
            creditUrl: row.credit_url || '',
            yaw: Number(row.initial_yaw) || 0,
            pitch: Number(row.initial_pitch) || 0,
            order: row.sort_order,
            is360: 'is_360' in row ? Boolean(row.is_360) : true,
            haov: Number(row.haov) || 0,
            hasTypeColumns: 'is_360' in row
        };
    }

    async function loadTourScenes(destinationId) {
        const result = await client.from('tour_scenes').select('*').eq('destination_id', destinationId).order('sort_order').order('created_at');
        if (result.error) {
            console.warn('Escenas 360° no disponibles (ejecuta database/visita_virtual.sql):', result.error.message);
            return null;
        }
        return result.data.map(mapScene);
    }

    async function saveTourScene(scene) {
        const values = {
            destination_id: scene.destinationId,
            title: scene.title,
            description: scene.description || '',
            image_url: scene.image,
            credit: scene.credit || null,
            credit_url: scene.creditUrl || null,
            initial_yaw: Number(scene.yaw) || 0,
            initial_pitch: Number(scene.pitch) || 0,
            sort_order: Number(scene.order) || 0,
            is_360: scene.is360 !== false,
            haov: scene.is360 === false ? (Number(scene.haov) || null) : null
        };
        if (scene.id) values.id = scene.id;
        return mapScene(throwIfError(await client.from('tour_scenes').upsert(values).select('*').single()));
    }

    async function deleteTourScene(sceneId) {
        throwIfError(await client.from('tour_scenes').delete().eq('id', sceneId));
    }

    async function deleteDestination(destinationId) {
        throwIfError(await client.from('destinations').delete().eq('id', destinationId));
    }

    async function loadPublicCatalog() {
        const [packageResult, promotionResult, destinationList] = await Promise.all([
            client.from('packages').select('*').eq('is_published', true).order('created_at', { ascending: false }),
            client.from('promotions').select('*').eq('is_active', true).order('created_at', { ascending: false }),
            loadDestinations()
        ]);
        return {
            packages: throwIfError(packageResult).map(mapPackage),
            promotions: throwIfError(promotionResult).map(mapPromotion),
            destinations: destinationList
        };
    }

    async function load(userId, role) {
        const authUserResult = await client.auth.getUser();
        const authUser = throwIfError(authUserResult).user;
        const [profileResult, packagesResult, promotionsResult, bookingsResult, receiptsResult] = await Promise.all([
            client.from('profiles').select('*').eq('user_id', userId).single(),
            client.from('packages').select('*').order('created_at', { ascending: false }),
            client.from('promotions').select('*').order('created_at', { ascending: false }),
            client.from('bookings').select('*').order('created_at', { ascending: false }),
            client.from('receipts').select('*, bookings(booking_code, package_name)').order('issued_at', { ascending: false })
        ]);
        const profile = throwIfError(profileResult);
        const rolePackages = throwIfError(packagesResult);
        const rolePromotions = throwIfError(promotionsResult);
        const roleBookings = throwIfError(bookingsResult);
        const roleReceipts = throwIfError(receiptsResult);
        const avatar = profile.avatar_path ? client.storage.from('profile-avatars').getPublicUrl(profile.avatar_path).data.publicUrl : '';
        return {
            user: {
                id: userId,
                firstName: profile.first_name,
                lastName: profile.last_name,
                name: profile.full_name,
                document: profile.document_number || '',
                phone: profile.phone || '',
                email: authUser.email || profile.email || '',
                avatar
            },
            role,
            packages: rolePackages.map(mapPackage),
            promotions: rolePromotions.map(mapPromotion),
            bookings: roleBookings.map(mapBooking),
            invoices: roleReceipts.map(mapReceipt),
            complaints: ['admin', 'atencion'].includes(role) ? await loadComplaints() : [],
            destinations: await loadDestinations()
        };
    }

    async function uploadDataUrl(bucket, userId, dataUrl) {
        const match = /^data:(image\/(?:png|jpeg|webp));base64,([\s\S]+)$/.exec(dataUrl || '');
        if (!match) throw new Error('Selecciona una imagen JPG, PNG o WEBP.');
        const bytes = Uint8Array.from(atob(match[2]), character => character.charCodeAt(0));
        const extension = match[1] === 'image/jpeg' ? 'jpg' : match[1].split('/')[1];
        const path = `${userId}/${crypto.randomUUID()}.${extension}`;
        const result = await client.storage.from(bucket).upload(path, new Blob([bytes], { type: match[1] }), { contentType: match[1], upsert: false });
        throwIfError(result);
        return { path, url: client.storage.from(bucket).getPublicUrl(path).data.publicUrl };
    }

    async function saveProfile(userId, profile, avatarDataUrl) {
        const authUserResult = await client.auth.getUser();
        const authUser = throwIfError(authUserResult).user;
        let emailChangePending = false;
        if (profile.email && profile.email.toLowerCase() !== authUser.email?.toLowerCase()) {
            const emailResult = await client.auth.updateUser({ email: profile.email });
            throwIfError(emailResult);
            emailChangePending = true;
        }
        let avatarPath = profile.avatarPath || null;
        if (avatarDataUrl === '') avatarPath = null;
        else if (avatarDataUrl?.startsWith('data:image/')) avatarPath = (await uploadDataUrl('profile-avatars', userId, avatarDataUrl)).path;
        const result = await client.from('profiles').update({
            first_name: profile.firstName,
            last_name: profile.lastName,
            document_number: profile.document,
            phone: profile.phone,
            avatar_path: avatarPath,
            updated_at: new Date().toISOString()
        }).eq('user_id', userId).select('*').single();
        const savedProfile = throwIfError(result);
        const avatarUrl = savedProfile.avatar_path ? client.storage.from('profile-avatars').getPublicUrl(savedProfile.avatar_path).data.publicUrl : '';
        return { profile: savedProfile, avatarUrl, emailChangePending };
    }

    async function savePackage(userId, packageItem, imageDataUrl) {
        let imagePath = packageItem.imagePath || null;
        let imageUrl = packageItem.imageUrl || null;
        if (imageDataUrl?.startsWith('data:image/')) {
            imagePath = (await uploadDataUrl('package-images', userId, imageDataUrl)).path;
            imageUrl = null;
        }
        if (!imagePath && !imageUrl) throw new Error('Sube una foto del paquete antes de publicarlo.');
        const values = {
            name: packageItem.name,
            destination: packageItem.destination,
            duration: packageItem.duration,
            description: packageItem.description,
            price: packageItem.price,
            available_spots: packageItem.stock,
            image_path: imagePath,
            image_url: imageUrl,
            services_included: packageItem.includes,
            services_excluded: packageItem.excludes,
            is_published: packageItem.active,
            created_by: userId,
            updated_at: new Date().toISOString()
        };
        if (packageItem.id && /^[0-9a-f-]{36}$/i.test(packageItem.id)) values.id = packageItem.id;
        const result = await client.from('packages').upsert(values).select('*').single();
        return mapPackage(throwIfError(result));
    }

    async function deletePackage(packageId) {
        const result = await client.from('packages').delete().eq('id', packageId);
        throwIfError(result);
    }

    async function savePromotion(userId, promotion) {
        const result = await client.from('promotions').insert({
            package_id: promotion.packageId,
            title: promotion.title,
            discount_percent: promotion.discount,
            starts_on: promotion.startsOn,
            ends_on: promotion.endsOn,
            is_active: promotion.active,
            created_by: userId
        }).select('*').single();
        return mapPromotion(throwIfError(result));
    }

    async function updatePromotion(promotionId, values) {
        const result = await client.from('promotions').update(values).eq('id', promotionId).select('*').single();
        return mapPromotion(throwIfError(result));
    }

    async function deletePromotion(promotionId) {
        const result = await client.from('promotions').delete().eq('id', promotionId);
        throwIfError(result);
    }

    async function createBooking(userId, booking) {
        const result = await client.rpc('create_booking', {
            package_id_input: booking.packageId,
            travel_date_input: booking.date,
            passenger_count_input: booking.passengers
        });
        return { ...mapBooking(throwIfError(result)), customer: booking.customer, email: booking.email };
    }

    async function updateBookingStatus(bookingId, status) {
        const result = await client.from('bookings').update({ status: statusToDb[status], updated_at: new Date().toISOString() }).eq('id', bookingId).select('*').single();
        return mapBooking(throwIfError(result));
    }

    async function cancelOwnBooking(bookingId) {
        const result = await client.rpc('cancel_booking', { booking_id_input: bookingId });
        throwIfError(result);
    }

    async function createReceipt(userId, receipt) {
        const result = await client.from('receipts').insert({
            receipt_number: receipt.id,
            kind: receipt.type === 'FACTURA' ? 'factura' : 'boleta',
            booking_id: receipt.bookingId,
            user_id: receipt.userId,
            buyer_name: receipt.businessName || receipt.buyerName || receipt.customer,
            buyer_document: receipt.document || null,
            business_name: receipt.businessName || null,
            ruc: receipt.ruc || null,
            subtotal: receipt.subtotal,
            tax: receipt.tax,
            total: receipt.total,
            issued_by: userId
        }).select('*, bookings(booking_code, package_name)').single();
        return mapReceipt(throwIfError(result));
    }

    async function removeOwnAccount() {
        const { error } = await client.auth.signOut();
        if (error) throw error;
    }

    window.OrquideasStore = {
        currentRole,
        loadPublicCatalog,
        load,
        saveProfile,
        savePackage,
        deletePackage,
        savePromotion,
        updatePromotion,
        deletePromotion,
        createBooking,
        updateBookingStatus,
        cancelOwnBooking,
        createReceipt,
        removeOwnAccount,
        loadComplaints,
        loadDestinations,
        saveDestination,
        deleteDestination,
        uploadTourImage,
        loadTourScenes,
        saveTourScene,
        deleteTourScene,
        mapDestination,
        updateComplaint,
        submitComplaint
    };
})();
