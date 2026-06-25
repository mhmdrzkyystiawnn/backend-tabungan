import { supabase } from "../config/supabase.js";
import { success, fail } from "../utils/response.js";
import AppError from "../utils/AppError.js";

export const getProfile = async (req, res) => {
    return success(
        res,
        'Profil user berhasil diambil.',
        {
            user: {
                id: req.user.id,
                email: req.user.email,
                name: req.user.user_metadata?.name,
                username: req.user.user_metadata?.username,
                avatar: req.user.user_metadata?.picture,
                role: req.user.app_metadata?.role || 'user',
            }
        }
    );
};

export const updateProfile = async (req, res) => {
    const { name, avatar, username } = req.body;

    if (!name && !avatar && !username) {
        return fail(
            res,
            'Minimal salah satu field (name, avatar, username) harus diisi.',
            400
        );
    }

    const updates = { data: {} };
    if (name) updates.data.name = name;
    if (avatar) updates.data.picture = avatar;
    if (username) updates.data.username = username;

    const { data, error } = await supabase.auth.updateUser(updates);

    if (error) throw new AppError(error.message, 400);

    return success(
        res,
        'Profil berhasil diperbarui.',
        {
            user: {
                id: data.user.id,
                email: data.user.email,
                name: data.user.user_metadata?.name,
                avatar: data.user.user_metadata?.picture,
                username: data.user.user_metadata?.username,
            }
        }
    );
};

export const changePassword = async (req, res) => {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
        return fail(res, 'old_password dan new_password wajib diisi.', 400);
    }

    if (new_password.length < 8) {
        return fail(res, 'Password baru minimal 8 karakter.', 400);
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: req.user.email,
        password: old_password,
    });

    if (signInError) throw new AppError('Password lama salah.', 401);

    const { error } = await supabase.auth.updateUser({
        password: new_password,
    });

    if (error) throw new AppError(error.message, 400);

    return success(
        res,
        'Password berhasil diubah. Silakan login kembali dengan password baru.'
    );
};