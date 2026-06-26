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

// =========================
// Public Services
// =========================

export const createTransaction = async (userId, payload) => {
    const { savings_id, type, amount, description } = payload;

    const savings = await findSavingsOrFail(userId, savings_id);

    let currentAmount = savings.current_amount;

    if (type === "deposit") {
        currentAmount += amount;
    } else if (type === "withdrawal") {
        if (currentAmount < amount) {
            throw new AppError("Saldo tabungan tidak mencukupi.", 400);
        }

        currentAmount -= amount;
    }

    const { error: updateError } = await supabase
        .from(SAVINGS_TABLE)
        .update({ current_amount: currentAmount })
        .eq("id", savings_id);

    if (updateError) {
        throw new AppError(updateError.message, 400);
    }

    const { data, error } = await supabase
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

    return {
        saldo_sekarang: currentAmount,
        detail_transaksi: data
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

    const balanceAfterRollback = rollbackTransaction(savings.current_amount, oldTransaction);

    const newTransaction = {
        type: payload.type ?? oldTransaction.type,
        amount: payload.amount ?? oldTransaction.amount,
        description: payload.description ?? oldTransaction.description
    };

    const finalBalance = applyTransaction(balanceAfterRollback, newTransaction);

    if (finalBalance < 0) {
        throw new AppError("Saldo tabungan tidak mencukupi.", 400);
    }

    const { error: savingsError } = await supabase
        .from(SAVINGS_TABLE)
        .update({ current_amount: finalBalance })
        .eq("id", savings.id)
        .eq("user_id", userId);

    if (savingsError) {
        throw new AppError(savingsError.message, 500);
    }

    const { data, error } = await supabase
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

    return {
        saldo_sekarang: finalBalance,
        detail_transaksi: data
    };
};

export const deleteTransaction = async (userId, transactionId) => {
    const transaction = await findTransactionOrFail(userId, transactionId);

    const savings = await findSavingsOrFail(userId, transaction.savings_id);

    const restoredAmount = rollbackTransaction(savings.current_amount, transaction);

    const { error: savingsError } = await supabase
        .from(SAVINGS_TABLE)
        .update({ current_amount: restoredAmount })
        .eq("id", transaction.savings_id)
        .eq("user_id", userId);

    if (savingsError) {
        throw new AppError(savingsError.message, 500);
    }

    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq("id", transactionId)
        .eq("user_id", userId);

    if (error) {
        throw new AppError(error.message, 500);
    }

    return {
        saldo_sekarang: restoredAmount
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