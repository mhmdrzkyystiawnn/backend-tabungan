import { supabase } from "../config/supabase.js";
import AppError from "../utils/AppError.js";

const SAVINGS_TABLE = "savings_goals";
const TRANSACTION_TABLE = "transactions";
const DEFAULT_RECENT_LIMIT = 5;

const findSavingsOrFail = async (userId, savingsId) => {
    const { data, error } = await supabase
        .from(SAVINGS_TABLE)
        .select("id, name")
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

const normalizeMonthFilter = (month) => {
    if (!month) {
        throw new AppError("Parameter month wajib diisi.", 400);
    }

    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);

    if (!match) {
        throw new AppError("Format month harus YYYY-MM.", 400);
    }

    const year = Number(match[1]);
    const monthNumber = Number(match[2]);

    return {
        startDate: new Date(Date.UTC(year, monthNumber - 1, 1)),
        endDate: new Date(Date.UTC(year, monthNumber, 1)),
    };
};

export const getDashboard = async (userId) => {
    // PERBAIKAN PERINGATAN #8: Agregasi langsung di tingkat database menggunakan RPC
    // Jauh lebih cepat dan hemat memori dibandingkan me-load ribuan row ke Node.js
    const { data, error } = await supabase.rpc("get_dashboard_summary", { 
        p_user_id: userId 
    });

    if (error) {
        throw new AppError(`Gagal mengambil summary dashboard: ${error.message}`, 500);
    }

    // Jika return dari RPC sudah berupa single object yang rapi,
    // kita tinggal mengembalikannya langsung.
    return data;
};

export const getStatistics = async (userId) => {
    const { data: transactions, error } = await supabase
        .from(TRANSACTION_TABLE)
        .select("created_at, type, amount")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

    if (error) {
        throw new AppError(error.message, 500);
    }

    const monthlyStats = {};

    transactions.forEach((tx) => {
        const date = new Date(tx.created_at);
        const yearMonth = date.toISOString().slice(0, 7);

        if (!monthlyStats[yearMonth]) {
            monthlyStats[yearMonth] = {
                month: yearMonth,
                deposit: 0,
                withdrawal: 0,
            };
        }

        if (tx.type === "deposit") {
            monthlyStats[yearMonth].deposit += Number(tx.amount);
        } else if (tx.type === "withdrawal") {
            monthlyStats[yearMonth].withdrawal += Number(tx.amount);
        }
    });

    return {
        per_month: Object.values(monthlyStats),
    };
};

export const getRecentTransactions = async (userId, limit = DEFAULT_RECENT_LIMIT) => {
    const normalizedLimit = Math.max(Number(limit) || DEFAULT_RECENT_LIMIT, 1);

    const { data, error } = await supabase
        .from(TRANSACTION_TABLE)
        .select("id, type, amount, description, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(normalizedLimit);

    if (error) {
        throw new AppError(error.message, 500);
    }

    return {
        recent_transactions: data,
    };
};

export const getMonthlySummary = async (userId, filters = {}) => {
    const { month, savings_id } = filters;
    const { startDate, endDate } = normalizeMonthFilter(month);

    let savings = null;

    if (savings_id) {
        savings = await findSavingsOrFail(userId, savings_id);
    }

    let query = supabase
        .from(TRANSACTION_TABLE)
        .select("id, type, amount, description, created_at, savings_id")
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())
        .lt("created_at", endDate.toISOString());

    if (savings_id) {
        query = query.eq("savings_id", savings_id);
    }

    const { data: transactions, error } = await query.order("created_at", { ascending: true });

    if (error) {
        throw new AppError(error.message, 500);
    }

    const deposit = transactions.reduce((sum, tx) => {
        return tx.type === "deposit" ? sum + Number(tx.amount) : sum;
    }, 0);

    const withdrawal = transactions.reduce((sum, tx) => {
        return tx.type === "withdrawal" ? sum + Number(tx.amount) : sum;
    }, 0);

    return {
        month,
        savings_id: savings?.id ?? null,
        savings_name: savings?.name ?? null,
        totals: {
            deposit,
            withdrawal,
            net: deposit - withdrawal,
        },
        transactions,
    };
};
