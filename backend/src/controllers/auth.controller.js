import { supabase } from "../config/supabase.js";
import { success } from "../utils/response.js";
import AppError from "../utils/AppError.js";

export const register = async (req, res) => {
    const { data, error } = await supabase.auth.signUp({
        email: req.validated.body.email,
        password: req.validated.body.password,
    });

    if (error) throw new AppError(error.message, 400);

    return success(
        res,
        "Registrasi berhasil! Silakan cek email Anda untuk verifikasi.",
        data,
        201
    );
};

export const login = async (req, res) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: req.validated.body.email,
        password: req.validated.body.password,
    });

    if (error) throw new AppError(error.message, 401);

    return success(
        res,
        "Login sukses!",
        {
            token: data.session?.access_token,
            refresh_token: data.session?.refresh_token,
            user: data.user
        }
    );
};

export const refresh = async (req, res) => {
    const { data, error } = await supabase.auth.refreshSession({
        refresh_token: req.validated.body.refresh_token,
    });

    if (error) throw new AppError(error.message, 400);

    return success(
        res,
        "Token berhasil diperbarui",
        {
            access_token: data.session?.access_token,
            refresh_token: data.session?.refresh_token
        }
    );
};

export const logout = async (req, res) => {
    const { error } = await supabase.auth.signOut();

    if (error) throw new AppError(error.message, 400);

    return success(
        res,
        'Logout berhasil. Hapus token dari client.'
    );
};