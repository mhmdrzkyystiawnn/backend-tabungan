import { supabase } from "../config/supabase.js";
import AppError from "../utils/AppError.js";

// =========================
// Constants
// =========================

const TABLE_NAME = "transactions";
const SAVINGS_TABLE = "savings_goals";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const ALLOWED_SORT = Object.freeze(["asc", "desc"]);

// =========================
// Private Helpers
// =========================

const findTransactionOrFail = async (userId, transactionId) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .eq("id", transactionId)
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw new AppError(error.message, 500);
    }

    if (!data) {
        throw new AppError("Transaksi tidak ditemukan.", 404);
    }

    return data;
};

const findSavingsOrFail = async (userId, savingsId) => {
    const { data, error } = await supabase
        .from(SAVINGS_TABLE)
        .select("*")
        .eq("id", savingsId)
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw new AppError(error.message, 500);
    }

    if (!data) {
        throw new AppError("Target tabungan tidak ditemukan.", 404);
    }

    return data;
};

const rollbackTransaction = (currentAmount, transaction) => {
    if (transaction.type === "deposit") {
        return currentAmount - transaction.amount;
    }

    return currentAmount + transaction.amount;
};

const applyTransaction = (currentAmount, transaction) => {
    if (transaction.type === "deposit") {
        return currentAmount + transaction.amount;
    }

    return currentAmount - transaction.amount;
};

const persistSavingsBalance = async (userId, savingsId, balance) => {
    const { error } = await supabase
        .from(SAVINGS_TABLE)
        .update({ current_amount: balance })
        .eq("id", savingsId)
        .eq("user_id", userId);

    if (error) {
        throw new AppError(error.message, 500);
    }
};

// =========================
// Public Services
// =========================

export const createTransaction = async (userId, payload) => {
    const { savings_id, type, amount, description } = payload;

    const { data, error } = await supabase.rpc("create_transaction_rpc", {
        p_user_id: userId,
        p_savings_id: savings_id,
        p_type: type,
        p_amount: amount,
        p_description: description ?? ""
    });

    if (error) {
        throw new AppError(error.message, 400);
    }

    return data;
};

export const getTransactions = async (userId, queryParams) => {
    const page = Math.max(Number(queryParams.page) || 1, 1);
    const limit = Math.min(Math.max(Number(queryParams.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    const sort = ALLOWED_SORT.includes(queryParams.sort) ? queryParams.sort : "desc";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from(TABLE_NAME)
        .select("*", { count: "exact" })
        .eq("user_id", userId);

    if (queryParams.type) {
        query = query.eq("type", queryParams.type);
    }

    if (queryParams.savings_id) {
        // PERBAIKAN PERINGATAN #6: Pastikan savings_id benar-benar valid dan milik user yang login
        // sebelum melakukan query pencarian transaksi.
        await findSavingsOrFail(userId, queryParams.savings_id);
        
        query = query.eq("savings_id", queryParams.savings_id);
    }

    if (queryParams.search) {
        query = query.ilike("description", `%${queryParams.search.trim()}%`);
    }

    query = query
        .order("created_at", { ascending: sort === "asc" })
        .range(from, to);

    const { data, error, count } = await query;

    if (error) {
        throw new AppError(error.message, 500);
    }

    return {
        transactions: data,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.max(Math.ceil(count / limit), 1)
        }
    };
};

export const getTransactionById = async (userId, transactionId) => {
    return findTransactionOrFail(userId, transactionId);
};

export const updateTransaction = async (userId, transactionId, payload) => {
    const oldTransaction = await findTransactionOrFail(userId, transactionId);

    const newTransaction = {
        type: payload.type ?? oldTransaction.type,
        amount: payload.amount ?? oldTransaction.amount,
        description: payload.description ?? oldTransaction.description
    };

    const { data, error } = await supabase.rpc("update_transaction_rpc", {
        p_user_id: userId,
        p_transaction_id: transactionId,
        p_type: newTransaction.type,
        p_amount: newTransaction.amount,
        p_description: newTransaction.description
    });

    if (error) {
        throw new AppError(error.message, 500);
    }

    return data;
};

export const deleteTransaction = async (userId, transactionId) => {
    const { data, error } = await supabase.rpc("delete_transaction_rpc", {
        p_user_id: userId,
        p_transaction_id: transactionId
    });

    if (error) {
        throw new AppError(error.message, 500);
    }

    return data;
};

export const getTransactionsBySavingsId = async (userId, savingsId, queryParams) => {
    await findSavingsOrFail(userId, savingsId);

    const page = Math.max(Number(queryParams.page) || 1, 1);
    const limit = Math.min(Math.max(Number(queryParams.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    const sort = ALLOWED_SORT.includes(queryParams.sort) ? queryParams.sort : "desc";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from(TABLE_NAME)
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .eq("savings_id", savingsId);

    if (queryParams.type) {
        query = query.eq("type", queryParams.type);
    }

    query = query
        .order("created_at", { ascending: sort === "asc" })
        .range(from, to);

    const { data, error, count } = await query;

    if (error) {
        throw new AppError(error.message, 500);
    }

    return {
        transactions: data,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.max(Math.ceil(count / limit), 1)
        }
    };
};