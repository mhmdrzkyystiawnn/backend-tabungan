import path from "path";
import { createSupabaseClientWithToken, supabase } from "../config/supabase.js";
import { success } from "../utils/response.js";
import AppError from "../utils/AppError.js";

const extractStoragePathFromUrl = (url, bucketName) => {
    if (!url || typeof url !== "string") {
        return null;
    }

    try {
        const parsedUrl = new URL(url);
        const segments = parsedUrl.pathname.split("/").filter(Boolean);
        const objectIndex = segments.indexOf("object");

        if (objectIndex === -1 || segments[objectIndex + 1] !== "public") {
            return null;
        }

        const bucketInUrl = segments[objectIndex + 2];
        if (bucketInUrl !== bucketName) {
            return null;
        }

        return decodeURIComponent(segments.slice(objectIndex + 3).join("/"));
    } catch {
        return null;
    }
};

const deleteStorageObject = async (bucketName, imageUrl) => {
    if (!imageUrl) {
        return;
    }

    const objectPath = extractStoragePathFromUrl(imageUrl, bucketName);
    if (!objectPath) {
        return;
    }

    try {
        await supabase.storage.from(bucketName).remove([objectPath]);
    } catch {
        // Ignore cleanup errors so the upload flow still succeeds.
    }
};

const buildProfileResponse = (user, profile = {}) => ({
    id: user.id,
    email: user.email,
    name: profile.full_name || user.user_metadata?.full_name || user.user_metadata?.name || null,
    username: profile.username || user.user_metadata?.username || null,
    avatar: profile.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    role: user.app_metadata?.role || "user",
});

const syncProfileRecord = async (userId, profileData = {}) => {
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

const updateAuthProfileMetadata = async (userId, updates, accessToken) => {
    const metadata = {};

    if (updates.full_name !== undefined) {
        metadata.full_name = updates.full_name;
        metadata.name = updates.full_name;
    }

    if (updates.username !== undefined) {
        metadata.username = updates.username;
    }

    if (updates.avatar_url !== undefined) {
        metadata.avatar_url = updates.avatar_url;
    }

    if (!Object.keys(metadata).length) {
        return;
    }

    // Selalu pakai token user untuk updateUser().
    // supabase.auth.admin.updateUserById() membutuhkan service_role key yang dikonfigurasi
    // secara spesifik — tidak selalu tersedia. Fallback ke supabase (tanpa token)
    // akan gagal dengan "This endpoint requires a valid Bearer token".
    // Solusi: selalu buat client dengan accessToken user yang sudah terverifikasi.
    if (!accessToken) {
        throw new AppError("Token user tidak tersedia untuk update metadata.", 500);
    }

    const client = createSupabaseClientWithToken(accessToken);

    const { error } = await client.auth.updateUser({
        data: metadata,
    });

    if (error) {
        throw new AppError(error.message, 400);
    }
};

export const getProfile = async (req, res) => {
    const { data, error } = await supabase
        .from("profiles")
        .select("full_name, username, avatar_url")
        .eq("id", req.user.id)
        .maybeSingle();

    if (error) throw new AppError(error.message, 400);

    return success(
        res,
        "Profil user berhasil diambil.",
        {
            user: buildProfileResponse(req.user, data || {}),
        }
    );
};

export const updateProfile = async (req, res) => {
    const updates = {};

    if (req.validated.body.name !== undefined) {
        updates.full_name = req.validated.body.name;
    }

    if (req.validated.body.avatar !== undefined) {
        updates.avatar_url = req.validated.body.avatar;
    }

    if (req.validated.body.username !== undefined) {
        updates.username = req.validated.body.username;
    }

    if (Object.keys(updates).length > 0) {
        await syncProfileRecord(req.user.id, updates);

        try {
            await updateAuthProfileMetadata(req.user.id, updates, req.token);
        } catch {
            // Profile data is still saved even if auth metadata sync is unavailable.
        }
    }

    const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, username, avatar_url")
        .eq("id", req.user.id)
        .maybeSingle();

    return success(
        res,
        "Profil berhasil diperbarui.",
        {
            user: buildProfileResponse(req.user, profileData || {}),
        }
    );
};

export const uploadAvatar = async (req, res) => {
    if (!req.file) {
        throw new AppError("File avatar wajib diunggah.", 400);
    }

    const file = req.file;
    const extension = path.extname(file.originalname) || ".jpg";
    const safeName = `${req.user.id}/${Date.now()}${extension}`;
    const contentType = file.mimetype || "image/jpeg";
    const buffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer);

    try {
        await supabase.storage.createBucket("avatars", {
            public: true,
            fileSizeLimit: 2 * 1024 * 1024,
            allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        });
    } catch (error) {
        // Ignore if the bucket already exists.
    }

    const { data: existingProfile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", req.user.id)
        .maybeSingle();

    const { data, error } = await supabase.storage.from("avatars").upload(safeName, buffer, {
        contentType,
        upsert: true,
    });

    let avatarUrl = null;

    if (!error && data?.path) {
        const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(data.path);
        avatarUrl = publicData.publicUrl;
    } else {
        avatarUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
    }

    await syncProfileRecord(req.user.id, { avatar_url: avatarUrl });
    await deleteStorageObject("avatars", existingProfile?.avatar_url);

    return success(
        res,
        "Foto profil berhasil diunggah.",
        {
            user: buildProfileResponse(req.user, { avatar_url: avatarUrl }),
        }
    );
};

export const changePassword = async (req, res) => {
    // 1. Verifikasi password lama dengan membuat session SEMENTARA
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: req.user.email,
        password: req.validated.body.old_password,
    });

    if (signInError) throw new AppError("Password lama salah.", 401);

    if (!signInData?.session?.access_token || !signInData?.session?.refresh_token) {
        throw new AppError("Session untuk mengganti password tidak tersedia.", 400);
    }

    const tempClient = createSupabaseClientWithToken(signInData.session.access_token);
    const { error: sessionError } = await tempClient.auth.setSession({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
    });

    if (sessionError) throw new AppError(sessionError.message, 400);

    const { error: updateError } = await tempClient.auth.updateUser({
        password: req.validated.body.new_password,
    });

    await tempClient.auth.signOut().catch(() => {});

    if (updateError) throw new AppError(updateError.message, 400);

    return success(
        res,
        "Password berhasil diubah. Silakan login kembali dengan password baru."
    );
};
