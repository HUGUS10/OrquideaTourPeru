(() => {
    const client = window.supabaseClient;
    const statusToUi = { pending: 'PENDIENTE', confirmed: 'CONFIRMADA', cancelled: 'CANCELADA', rejected: 'CANCELADA', completed: 'FINALIZADA' };
    const statusToDb = { PENDIENTE: 'pending', CONFIRMADA: 'confirmed', CANCELADA: 'cancelled', RECHAZADA: 'rejected', FINALIZADA: 'completed' };

    function throwIfError(result) {
        if (result.error) throw result.error;
        return result.data;
    }

    function mapPackage(row) {
        const image = row.image_url || (row.image_path ? client.storage.from('package-images').getPublicUrl(row.image_path).data.publicUrl : '');
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
            status: statusToUi[row.status] || 'PENDIENTE'
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

    async function currentRole(userId) {
        const result = await client.from('user_roles').select('role').eq('user_id', userId);
        return throwIfError(result).some(record => record.role === 'admin') ? 'admin' : 'client';
    }

    async function loadPublicCatalog() {
        const [packageResult, promotionResult] = await Promise.all([
            client.from('packages').select('*').eq('is_published', true).order('created_at', { ascending: false }),
            client.from('promotions').select('*').eq('is_active', true).order('created_at', { ascending: false })
        ]);
        return {
            packages: throwIfError(packageResult).map(mapPackage),
            promotions: throwIfError(promotionResult).map(mapPromotion)
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
            invoices: roleReceipts.map(mapReceipt)
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
        removeOwnAccount
    };
})();
