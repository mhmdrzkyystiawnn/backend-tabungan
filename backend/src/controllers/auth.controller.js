import { supabase } from "../config/supabase.js";
import { success } from "../utils/response.js";
import AppError from "../utils/AppError.js";

const buildUserPayload = (user, profile = {}) => ({
    id: user.id,
    email: user.email,
    name: profile.full_name || user.user_metadata?.full_name || user.user_metadata?.name || null,
    username: profile.username || user.user_metadata?.username || null,
    avatar: profile.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
});

const ensureProfile = async (userId, profileData = {}) => {
    if (!userId) return null;

    const { error } = await supabase
        .from("profiles")
        .upsert(
            {
                id: userId,
                ...profileData,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
        );

    if (error) {
        throw new AppError(`Gagal menyimpan profil: ${error.message}`, 400);
    }

    return profileData;
};

export const register = async (req, res) => {
    const { email, password, name, username } = req.validated.body;

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
                name,
                username: username || null,
            },
        },
    });

    if (error) throw new AppError(error.message, 400);

    if (data?.user) {
        await ensureProfile(data.user.id, {
            full_name: name,
            username: username || null,
        });
    }

    return success(
        res,
        "Registrasi berhasil! Silakan cek email Anda untuk verifikasi.",
        {
            user: data?.user
                ? buildUserPayload(data.user, {
                    full_name: name,
                    username: username || null,
                })
                : null,
            session: data.session,
        },
        201
    );
};

export const login = async (req, res) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: req.validated.body.email,
        password: req.validated.body.password,
    });

    if (error) throw new AppError(error.message, 401);

    const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, username, avatar_url")
        .eq("id", data.user.id)
        .maybeSingle();

    return success(
        res,
        "Login sukses!",
        {
            token: data.session?.access_token,
            refresh_token: data.session?.refresh_token,
            user: buildUserPayload(data.user, profileData || {}),
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

// ====== PERBAIKAN ======

// Option A: Menggunakan `req.supabase` yang sudah dibuat oleh middleware
export const logout = async (req, res) => {
    // Gunakan instance supabase yang membawa token milik user saat ini
    const { error } = await req.supabase.auth.signOut(); 

    if (error) throw new AppError(error.message, 400);

    return success(
        res,
        'Logout berhasil. Session di server telah dihapus.'
    );
};
