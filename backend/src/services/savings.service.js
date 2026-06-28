// services/savings.service.js
import path from "path";
import { supabase } from "../config/supabase.js";
import AppError from "../utils/AppError.js";

// ⑤ Constants untuk nama tabel agar terpusat
const TABLE_NAME = "savings_goals";

// ① Freeze whitelist untuk keamanan array
const ALLOWED_SORT = Object.freeze(["asc", "desc"]);

// ② Menghilangkan Magic Numbers
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const extractStoragePathFromUrl = (url, bucketName) => {
    if (!url || typeof url !== "string") {
        return null;
    }

    try {
        const parsedUrl = new URL(url);
        const segments = parsedUrl.pathname.split("/").filter(Boolean);
        const objectIndex = segments.indexOf("object");

        if (objectIndex === -1 || segments[objectIndex + 1] !== "public") {
            return null;
        }

        const bucketInUrl = segments[objectIndex + 2];
        if (bucketInUrl !== bucketName) {
            return null;
        }

        return decodeURIComponent(segments.slice(objectIndex + 3).join("/"));
    } catch {
        return null;
    }
};

const deleteStorageObject = async (bucketName, imageUrl) => {
    if (!imageUrl) {
        return;
    }

    const objectPath = extractStoragePathFromUrl(imageUrl, bucketName);
    if (!objectPath) {
        return;
    }

    try {
        await supabase.storage.from(bucketName).remove([objectPath]);
    } catch {
        // Ignore cleanup errors so the upload flow still succeeds.
    }
};

// Private helper - Encapsulated
const findSavingsOrFail = async (userId, savingsId) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .eq("id", savingsId)
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw new AppError(error.message, 500);
    }

    if (!data) {
        throw new AppError(
            "Target tabungan tidak ditemukan.",
            404
        );
    }

    return data;
};

const normalizeSavings = (data) => ({
    ...data,
    image_url: data?.image_url || null,
});

export const createSavings = async (userId, payload) => {
    const { name, target_amount, image_url } = payload;

    // ⑥ Defensive trimming untuk membersihkan whitespace input
    const cleanName = name ? name.trim() : "";
    if (!cleanName) {
        throw new AppError("Nama tabungan tidak boleh kosong.", 400);
    }

    const amount = Number(target_amount);
    if (Number.isNaN(amount) || amount <= 0) {
        throw new AppError("Target tabungan tidak valid.", 400);
    }

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert([
            {
                user_id: userId,
                name: cleanName,
                target_amount: amount,
                current_amount: 0,
                image_url: image_url || null
            }
        ])
        .select()
        .single();

    if (error) {
        throw new AppError(error.message, 400);
    }

    return normalizeSavings(data);
};

export const getSavings = async (userId, queryParams) => {
    const { search, keyword } = queryParams;

    // ⑦ Pagination Guard menggunakan konstanta yang jelas
    const page = Math.max(Number(queryParams.page) || 1, 1);
    const limit = Math.min(Math.max(Number(queryParams.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    // ① Menggunakan Whitelist yang dibekukan
    const sort = ALLOWED_SORT.includes(queryParams.sort) ? queryParams.sort : "desc";

    // ③ Menambahkan .trim() untuk mencegah query kosong (whitespace)
    const searchTerm = (search || keyword || "").trim();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from(TABLE_NAME)
        .select("*", { count: "exact" })
        .eq("user_id", userId);

    if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
    }

    query = query
        .order("created_at", {
            ascending: sort === "asc"
        })
        .range(from, to);

    const { data, error, count } = await query;

    if (error) {
        throw new AppError(error.message, 500);
    }

    return {
        savings: (data || []).map(normalizeSavings),
        pagination: {
            total: count,
            page,
            limit,
            // ④ Menjaga totalPages minimal bernilai 1 agar frontend tidak kebingungan
            totalPages: Math.max(Math.ceil(count / limit), 1)
        }
    };
};

export const getSavingsById = async (userId, savingsId) => {
    const data = await findSavingsOrFail(userId, savingsId);
    return normalizeSavings(data);
};

export const updateSavings = async (userId, savingsId, payload) => {
    // 1. Simpan hasil pencarian ke dalam variabel existingSavings
    const existingSavings = await findSavingsOrFail(userId, savingsId);

    const { name, target_amount, image_url } = payload;
    const updates = {};

    if (name !== undefined) {
        const cleanName = name.trim();
        if (!cleanName) {
            throw new AppError("Nama tabungan tidak boleh kosong.", 400);
        }
        updates.name = cleanName;
    }

    if (target_amount !== undefined) {
        const amount = Number(target_amount);
        if (Number.isNaN(amount) || amount <= 0) {
            throw new AppError("Target tabungan tidak valid.", 400);
        }
        
        // 2. PERBAIKAN PERINGATAN #5: Validasi target_amount vs current_amount
        if (amount < existingSavings.current_amount) {
            throw new AppError(`Target tidak boleh lebih kecil dari saldo saat ini (${existingSavings.current_amount}).`, 400);
        }
        
        updates.target_amount = amount;
    }

    if (image_url !== undefined) {
        updates.image_url = image_url || null;
    }

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(updates)
        .eq("id", savingsId)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) {
        throw new AppError(error.message, 400);
    }

    return normalizeSavings(data);
};

export const uploadSavingsImage = async (userId, savingsId, file) => {
    if (!file) {
        throw new AppError("File gambar wajib diunggah.", 400);
    }

    const savings = await findSavingsOrFail(userId, savingsId);
    const extension = path.extname(file.originalname) || ".jpg";
    const safeName = `${userId}/${savingsId}/${Date.now()}${extension}`;
    const buffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer);
    const contentType = file.mimetype || "image/jpeg";

    try {
        await supabase.storage.createBucket("savings-images", {
            public: true,
            fileSizeLimit: 2 * 1024 * 1024,
            allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        });
    } catch {
        // Ignore bucket creation errors. The upload can still proceed if the bucket already exists.
    }

    let imageUrl = `data:${contentType};base64,${buffer.toString("base64")}`;

    try {
        const { data, error } = await supabase.storage.from("savings-images").upload(safeName, buffer, {
            contentType,
            upsert: true,
        });

        if (!error && data?.path) {
            const { data: publicData } = supabase.storage.from("savings-images").getPublicUrl(data.path);
            imageUrl = publicData.publicUrl;
        }
    } catch {
        // Fall back to a data URL so the endpoint still succeeds even when storage is unavailable.
    }

    const { data: updated, error: updateError } = await supabase
        .from(TABLE_NAME)
        .update({ image_url: imageUrl })
        .eq("id", savingsId)
        .eq("user_id", userId)
        .select()
        .single();

    if (updateError) {
        throw new AppError(updateError.message, 400);
    }

    await deleteStorageObject("savings-images", savings.image_url);

    return normalizeSavings(updated);
};

export const deleteSavings = async (userId, savingsId) => {
    await findSavingsOrFail(userId, savingsId);

    // 1. PERBAIKAN PERINGATAN #4: Hapus transaksi terkait terlebih dahulu (Manual Cascade)
    const { error: txError } = await supabase
        .from("transactions") // Pastikan nama tabel transaksi kamu benar "transactions"
        .delete()
        .eq("savings_id", savingsId)
        .eq("user_id", userId); // Tambahan keamanan memastikan milik user yang sama

    if (txError) {
        throw new AppError(`Gagal menghapus transaksi terkait: ${txError.message}`, 500);
    }

    // 2. Setelah transaksi bersih, baru hapus tabungannya
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq("id", savingsId)
        .eq("user_id", userId);

    if (error) {
        throw new AppError(error.message, 500);
    }

    return true;
};