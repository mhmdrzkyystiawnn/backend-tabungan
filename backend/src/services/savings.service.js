// services/savings.service.js
import { supabase } from "../config/supabase.js";
import AppError from "../utils/AppError.js";

export const createSavings = async (
    userId,
    payload
) => {

    const {
        name,
        target_amount
    } = payload;

    const { data, error } = await supabase
        .from("savings_goals")
        .insert([
            {
                user_id: userId,
                name,
                target_amount: Number(target_amount),
                current_amount: 0
            }
        ])
        .select()
        .single();

    if (error) {


        throw new AppError(
            error.message,
            400
        );

    }

    return data;

};

export const getSavings = async (userId, queryParams) => {

    const { search, keyword } = queryParams;

    const page = Number(queryParams.page) || 1;
    const limit = Number(queryParams.limit) || 10;
    const sort = queryParams.sort || "desc";

    const searchTerm = search || keyword;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from("savings_goals")
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
            totalPages: Math.ceil(count / limit)
        }
    };

};

export const getSavingsById = async (userId, savingsId) => {

    const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("id", savingsId)
        .eq("user_id", userId)
        .single();

    if (error) {
        throw new AppError(
            "Target tabungan tidak ditemukan.",
            404
        );
    }

    return data;

};

export const updateSavings = async (
    userId,
    savingsId,
    payload
) => {

    const { name, target_amount } = payload;

    const updates = {};

    if (name !== undefined)
        updates.name = name;

    if (target_amount !== undefined)
        updates.target_amount = Number(target_amount);

    const { data, error } = await supabase
        .from("savings_goals")
        .update(updates)
        .eq("id", savingsId)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) {
        throw new AppError(
            error.message,
            400
        );
    }

    return data;

};

export const deleteSavings = async (
    userId,
    savingsId
) => {

    const { error } = await supabase
        .from("savings_goals")
        .delete()
        .eq("id", savingsId)
        .eq("user_id", userId);

    if (!data) {
        throw new AppError(
            "Target tabungan tidak ditemukan.",
            404
        );
    }

    if (error) {
        throw new AppError(
            error.message,
            400
        );
    }

    return true;

};