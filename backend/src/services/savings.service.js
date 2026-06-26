// services/savings.service.js
import { supabase } from "../config/supabase.js";
import AppError from "../utils/AppError.js";

// ⑤ Constants untuk nama tabel agar terpusat
const TABLE_NAME = "savings_goals";

// ① Freeze whitelist untuk keamanan array
const ALLOWED_SORT = Object.freeze(["asc", "desc"]);

// ② Menghilangkan Magic Numbers
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

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

export const createSavings = async (userId, payload) => {
    const { name, target_amount } = payload;

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
                current_amount: 0
            }
        ])
        .select()
        .single();

    if (error) {
        throw new AppError(error.message, 400);
    }

    return data;
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
        savings: data,
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
    return await findSavingsOrFail(userId, savingsId);
};

export const updateSavings = async (userId, savingsId, payload) => {
    await findSavingsOrFail(userId, savingsId);

    const { name, target_amount } = payload;
    const updates = {};

    // ⑦ Trimming saat proses update data
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
        updates.target_amount = amount;
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

    return data;
};

export const deleteSavings = async (userId, savingsId) => {
    await findSavingsOrFail(userId, savingsId);

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