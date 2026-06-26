import { supabase } from "../config/supabase.js";
import { success } from "../utils/response.js";
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
    const updates = { data: {} };
    
    if (req.validated.body.name !== undefined) {
        updates.data.name = req.validated.body.name;
    }
    
    if (req.validated.body.avatar !== undefined) {
        updates.data.picture = req.validated.body.avatar;
    }
    
    if (req.validated.body.username !== undefined) {
        updates.data.username = req.validated.body.username;
    }

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
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: req.user.email,
        password: req.validated.body.old_password,
    });

    if (signInError) throw new AppError('Password lama salah.', 401);

    const { error } = await supabase.auth.updateUser({
        password: req.validated.body.new_password,
    });

    if (error) throw new AppError(error.message, 400);

    return success(
        res,
        'Password berhasil diubah. Silakan login kembali dengan password baru.'
    );
};