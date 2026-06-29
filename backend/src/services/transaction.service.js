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
    const balance = Number(currentAmount) || 0;
    const amount = Number(transaction.amount) || 0;

    if (transaction.type === "deposit") {
        return balance - amount;
    }

    return balance + amount;
};

const applyTransaction = (currentAmount, transaction) => {
    const balance = Number(currentAmount) || 0;
    const amount = Number(transaction.amount) || 0;

    if (transaction.type === "deposit") {
        return balance + amount;
    }

    return balance - amount;
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
    const savings = await findSavingsOrFail(userId, savings_id);
    const newBalance = applyTransaction(savings.current_amount, { type, amount });

    if (newBalance < 0) {
        throw new AppError("Saldo tabungan tidak boleh negatif.", 400);
    }

    const { data: transaction, error } = await supabase
        .from(TABLE_NAME)
        .insert([
            {
                user_id: userId,
                savings_id,
                type,
                amount,
                description: description ?? ""
            }
        ])
        .select()
        .single();

    if (error) {
        throw new AppError(error.message, 400);
    }

    try {
        await persistSavingsBalance(userId, savings_id, newBalance);
    } catch (error) {
        await supabase
            .from(TABLE_NAME)
            .delete()
            .eq("id", transaction.id)
            .eq("user_id", userId);

        throw error;
    }

    return {
        transaction,
        savings: {
            ...savings,
            current_amount: newBalance
        }
    };
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
    const savings = await findSavingsOrFail(userId, oldTransaction.savings_id);

    const newTransaction = {
        type: payload.type ?? oldTransaction.type,
        amount: payload.amount ?? oldTransaction.amount,
        description: payload.description ?? oldTransaction.description
    };

    const balanceAfterRollback = rollbackTransaction(savings.current_amount, oldTransaction);
    const newBalance = applyTransaction(balanceAfterRollback, newTransaction);

    if (newBalance < 0) {
        throw new AppError("Saldo tabungan tidak boleh negatif.", 400);
    }

    const { data: transaction, error } = await supabase
        .from(TABLE_NAME)
        .update({
            type: newTransaction.type,
            amount: newTransaction.amount,
            description: newTransaction.description
        })
        .eq("id", transactionId)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) {
        throw new AppError(error.message, 500);
    }

    await persistSavingsBalance(userId, oldTransaction.savings_id, newBalance);

    return {
        transaction,
        savings: {
            ...savings,
            current_amount: newBalance
        }
    };
};

export const deleteTransaction = async (userId, transactionId) => {
    const transaction = await findTransactionOrFail(userId, transactionId);
    const savings = await findSavingsOrFail(userId, transaction.savings_id);
    const newBalance = rollbackTransaction(savings.current_amount, transaction);

    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq("id", transactionId)
        .eq("user_id", userId);

    if (error) {
        throw new AppError(error.message, 500);
    }

    await persistSavingsBalance(userId, transaction.savings_id, newBalance);

    return {
        deleted: true,
        transaction
    };
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
