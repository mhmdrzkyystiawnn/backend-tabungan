import { success, fail } from "../utils/response.js";
import { supabase } from "../config/supabase.js"; // jika dibutuhkan di file ini

export const getProfile = async (req, res) => {
    return success(
        res,
        'Profil user berhasil diambil.',
        {
            id: req.user.id,
            email: req.user.email,
            name: req.user.user_metadata?.name,
            username: req.user.user_metadata?.username,
            avatar: req.user.user_metadata?.picture,
            role: req.user.app_metadata?.role || 'user',
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

    try {
        const updates = { data: {} };
        if (name) updates.data.name = name;
        if (avatar) updates.data.picture = avatar;
        if (username) updates.data.username = username;

        const { data, error } = await supabase.auth.updateUser(updates);

        if (error) {
            return fail(res, error.message, 400);
        }

        return success(
            res,
            'Profil berhasil diperbarui.',
            {
                id: data.user.id,
                email: data.user.email,
                name: data.user.user_metadata?.name,
                avatar: data.user.user_metadata?.picture,
                username: data.user.user_metadata?.username,
            }
        );
    } catch (err) {
        return fail(res, err.message, 500);
    }
};

export const changePassword = async (req, res) => {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
        return fail(res, 'old_password dan new_password wajib diisi.', 400);
    }

    if (new_password.length < 8) {
        return fail(res, 'Password baru minimal 8 karakter.', 400);
    }

    try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: req.user.email,
            password: old_password,
        });

        if (signInError) {
            return fail(res, 'Password lama salah.', 401);
        }

        const { data, error } = await supabase.auth.updateUser({
            password: new_password,
        });

        if (error) {
            return fail(res, error.message, 400);
        }

        return success(
            res,
            'Password berhasil diubah. Silakan login kembali dengan password baru.',
            {
                id: data.user.id,
                email: data.user.email,
            }
        );
    } catch (err) {
        return fail(res, err.message, 500);
    }
};