import crypto from "crypto";
import path from "path";

import { supabase } from "../config/supabase.js";
import AppError from "../utils/AppError.js";

const SHARED_SAVINGS_TABLE = "shared_savings";
const SHARED_MEMBERS_TABLE = "shared_members";
const SHARED_TRANSACTIONS_TABLE = "shared_transactions";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const ALLOWED_SORT = Object.freeze(["asc", "desc"]);

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

const findSharedSavingsOrFail = async (sharedSavingsId, options = {}) => {
    const { allowDeleted = false } = options;
    let query = supabase
        .from(SHARED_SAVINGS_TABLE)
        .select("*")
        .eq("id", sharedSavingsId);

    if (!allowDeleted) {
        query = query.eq("status", "active");
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
        throw new AppError(error.message, 500);
    }

    if (!data) {
        throw new AppError("Tabungan bersama tidak ditemukan.", 404);
    }

    return data;
};

const findMemberOrFail = async (userId, sharedSavingsId) => {
    const { data, error } = await supabase
        .from(SHARED_MEMBERS_TABLE)
        .select("*")
        .eq("user_id", userId)
        .eq("shared_savings_id", sharedSavingsId)
        .maybeSingle();

    if (error) {
        throw new AppError(error.message, 500);
    }

    if (!data) {
        throw new AppError("Anda bukan anggota tabungan bersama ini.", 403);
    }

    return data;
};

const findTransactionOrFail = async (transactionId) => {
    const { data, error } = await supabase
        .from(SHARED_TRANSACTIONS_TABLE)
        .select("*")
        .eq("id", transactionId)
        .maybeSingle();

    if (error) {
        throw new AppError(error.message, 500);
    }

    if (!data) {
        throw new AppError("Transaksi tabungan bersama tidak ditemukan.", 404);
    }

    return data;
};

const generateInviteCode = () => crypto.randomBytes(4).toString("hex").toUpperCase();

const generateUniqueInviteCode = async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const inviteCode = generateInviteCode();
        const { data, error } = await supabase
            .from(SHARED_SAVINGS_TABLE)
            .select("id")
            .eq("invite_code", inviteCode)
            .maybeSingle();

        if (error) {
            throw new AppError(error.message, 500);
        }

        if (!data) {
            return inviteCode;
        }
    }

    throw new AppError("Gagal menghasilkan kode undangan yang unik.", 500);
};

const normalizeSharedSavings = (data) => ({
    ...data,
    image_url: data?.image_url || null,
});

const getMemberDisplayName = async (userId) => {
    try {
        const { data, error } = await supabase
            .from("profiles")
            .select("full_name") // FIXED: dari name menjadi full_name
            .eq("id", userId)
            .maybeSingle();

        if (!error && data?.full_name) {
            return data.full_name;
        }
    } catch {
        // Fallback to user id if profile lookup is unavailable.
    }

    return userId;
};

export const createSharedSavings = async (userId, payload) => {
    let sharedSavings = null;

    try {
        const inviteCode = await generateUniqueInviteCode();

        const { data, error: createError } = await supabase
            .from(SHARED_SAVINGS_TABLE)
            .insert([
                {
                    owner_id: userId,
                    name: payload.name,
                    description: payload.description ?? "",
                    target_amount: payload.target_amount,
                    current_amount: 0,
                    image_url: payload.image_url || null,
                    invite_code: inviteCode,
                    status: "active"
                }
            ])
            .select()
            .single();

        if (createError) {
            throw new AppError(createError.message, 400);
        }

        sharedSavings = data;

        const { data: member, error: memberError } = await supabase
            .from(SHARED_MEMBERS_TABLE)
            .insert([
                {
                    shared_savings_id: sharedSavings.id,
                    user_id: userId,
                    role: "owner"
                }
            ])
            .select()
            .single();

        if (memberError) {
            await supabase
                .from(SHARED_SAVINGS_TABLE)
                .delete()
                .eq("id", sharedSavings.id);

            throw new AppError(memberError.message, 400);
        }

        return {
            shared_savings: normalizeSharedSavings(sharedSavings),
            member
        };
    } catch (error) {
        if (sharedSavings?.id) {
            await supabase
                .from(SHARED_SAVINGS_TABLE)
                .delete()
                .eq("id", sharedSavings.id);
        }

        throw error;
    }
};

export const getSharedSavings = async (userId, queryParams) => {
    const page = queryParams.page || 1;
    const limit = Math.min(Math.max(queryParams.limit || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const sort = ALLOWED_SORT.includes(queryParams.sort) ? queryParams.sort : "desc";
    const search = queryParams.search?.trim();

    const { data: memberships, error: membershipError } = await supabase
        .from(SHARED_MEMBERS_TABLE)
        .select("shared_savings_id")
        .eq("user_id", userId);

    if (membershipError) {
        throw new AppError(membershipError.message, 500);
    }

    if (!memberships?.length) {
        return {
            shared_savings: [],
            pagination: {
                total: 0,
                page,
                limit,
                totalPages: 1
            }
        };
    }

    const savingsIds = memberships.map((item) => item.shared_savings_id);
    let query = supabase
        .from(SHARED_SAVINGS_TABLE)
        .select("*", { count: "exact" })
        .in("id", savingsIds)
        .eq("status", "active");

    if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    query = query
        .order("created_at", { ascending: sort === "asc" })
        .range((page - 1) * limit, page * limit - 1);

    const { data, error, count } = await query;

    if (error) {
        throw new AppError(error.message, 500);
    }

    return {
        shared_savings: (data || []).map(normalizeSharedSavings),
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.max(Math.ceil(count / limit), 1)
        }
    };
};

export const getSharedSavingsById = async (userId, sharedSavingsId) => {
    const sharedSavings = await findSharedSavingsOrFail(sharedSavingsId);
    await findMemberOrFail(userId, sharedSavings.id);

    return normalizeSharedSavings(sharedSavings);
};

export const updateSharedSavings = async (userId, sharedSavingsId, payload) => {
    const sharedSavings = await findSharedSavingsOrFail(sharedSavingsId);
    const member = await findMemberOrFail(userId, sharedSavings.id);

    if (member.role !== "owner") {
        throw new AppError("Hanya owner yang dapat mengubah tabungan bersama.", 403);
    }

    const updatePayload = {};

    if (payload.name !== undefined) {
        updatePayload.name = payload.name;
    }

    if (payload.description !== undefined) {
        updatePayload.description = payload.description;
    }

    if (payload.target_amount !== undefined) {
        updatePayload.target_amount = payload.target_amount;
    }

    if (payload.image_url !== undefined) {
        updatePayload.image_url = payload.image_url || null;
    }

    const { data, error } = await supabase
        .from(SHARED_SAVINGS_TABLE)
        .update(updatePayload)
        .eq("id", sharedSavings.id)
        .select()
        .single();

    if (error) {
        throw new AppError(error.message, 400);
    }

    return normalizeSharedSavings(data);
};

export const uploadSharedSavingsImage = async (userId, sharedSavingsId, file) => {
    if (!file) {
        throw new AppError("File gambar wajib diunggah.", 400);
    }

    const sharedSavings = await findSharedSavingsOrFail(sharedSavingsId);
    const member = await findMemberOrFail(userId, sharedSavings.id);

    if (member.role !== "owner") {
        throw new AppError("Hanya owner yang dapat mengubah gambar tabungan bersama.", 403);
    }

    const extension = path.extname(file.originalname) || ".jpg";
    const safeName = `${userId}/${sharedSavingsId}/${Date.now()}${extension}`;
    const buffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer);
    const contentType = file.mimetype || "image/jpeg";

    try {
        await supabase.storage.createBucket("shared-savings-images", {
            public: true,
            fileSizeLimit: 2 * 1024 * 1024,
            allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        });
    } catch {
        // Ignore bucket creation errors.
    }

    let imageUrl = `data:${contentType};base64,${buffer.toString("base64")}`;

    try {
        const { data, error } = await supabase.storage.from("shared-savings-images").upload(safeName, buffer, {
            contentType,
            upsert: true,
        });

        if (!error && data?.path) {
            const { data: publicData } = supabase.storage.from("shared-savings-images").getPublicUrl(data.path);
            imageUrl = publicData.publicUrl;
        }
    } catch {
        // Fall back to a data URL so the endpoint still succeeds even when storage is unavailable.
    }

    const { data: updated, error: updateError } = await supabase
        .from(SHARED_SAVINGS_TABLE)
        .update({ image_url: imageUrl })
        .eq("id", sharedSavings.id)
        .select()
        .single();

    if (updateError) {
        throw new AppError(updateError.message, 400);
    }

    await deleteStorageObject("shared-savings-images", sharedSavings.image_url);

    return normalizeSharedSavings(updated);
};

export const deleteSharedSavings = async (userId, sharedSavingsId) => {
    const sharedSavings = await findSharedSavingsOrFail(sharedSavingsId, { allowDeleted: true });
    const member = await findMemberOrFail(userId, sharedSavings.id);

    if (member.role !== "owner") {
        throw new AppError("Hanya owner yang dapat menghapus tabungan bersama.", 403);
    }

    await Promise.allSettled([
        supabase
            .from(SHARED_TRANSACTIONS_TABLE)
            .delete()
            .eq("shared_savings_id", sharedSavings.id),
        supabase
            .from(SHARED_MEMBERS_TABLE)
            .delete()
            .eq("shared_savings_id", sharedSavings.id),
    ]);

    const { error: savingsDeleteError } = await supabase
        .from(SHARED_SAVINGS_TABLE)
        .update({
            status: "deleted",
            invite_code: null
        })
        .eq("id", sharedSavings.id);

    if (savingsDeleteError) {
        throw new AppError(savingsDeleteError.message, 500);
    }

    return { deleted: true };
};

export const joinSharedSavings = async (userId, payload) => {
    const normalizedCode = String(payload.invite_code ?? "").trim().toUpperCase();

    const { data: sharedSavings, error: sharedSavingsError } = await supabase
        .from(SHARED_SAVINGS_TABLE)
        .select("*")
        .eq("invite_code", normalizedCode)
        .eq("status", "active")
        .maybeSingle();

    if (sharedSavingsError) {
        throw new AppError(sharedSavingsError.message, 500);
    }

    if (!sharedSavings) {
        throw new AppError("Kode undangan tidak valid.", 404);
    }

    const existingMember = await supabase
        .from(SHARED_MEMBERS_TABLE)
        .select("id")
        .eq("user_id", userId)
        .eq("shared_savings_id", sharedSavings.id)
        .maybeSingle();

    if (existingMember.error) {
        throw new AppError(existingMember.error.message, 500);
    }

    if (existingMember.data) {
        throw new AppError("Anda sudah bergabung ke tabungan bersama ini.", 400);
    }

    const { data: member, error: memberError } = await supabase
        .from(SHARED_MEMBERS_TABLE)
        .insert([
            {
                shared_savings_id: sharedSavings.id,
                user_id: userId,
                role: "member"
            }
        ])
        .select()
        .single();

    if (memberError) {
        throw new AppError(memberError.message, 400);
    }

    return {
        shared_savings: sharedSavings,
        member
    };
};

export const getSharedSavingsMembers = async (userId, sharedSavingsId) => {
    const sharedSavings = await findSharedSavingsOrFail(sharedSavingsId);
    await findMemberOrFail(userId, sharedSavings.id);

    const { data, error } = await supabase
        .from(SHARED_MEMBERS_TABLE)
        .select("id, user_id, role, joined_at")
        .eq("shared_savings_id", sharedSavings.id)
        .order("joined_at", { ascending: true });

    if (error) {
        throw new AppError(error.message, 500);
    }

    const members = await Promise.all(
        (data || []).map(async (member) => ({
            id: member.id,
            user_id: member.user_id,
            name: await getMemberDisplayName(member.user_id),
            role: member.role,
            joined_at: member.joined_at
        }))
    );

    return { members };
};

export const createSharedTransaction = async (userId, payload) => {
    const sharedSavings = await findSharedSavingsOrFail(payload.shared_savings_id);
    await findMemberOrFail(userId, sharedSavings.id);

    const { data, error } = await supabase.rpc("create_shared_transaction_rpc", {
        p_user_id: userId,
        p_shared_savings_id: sharedSavings.id,
        p_type: payload.type,
        p_amount: payload.amount,
        p_description: payload.description ?? ""
    });

    if (error) {
        throw new AppError(error.message, 400);
    }

    return data;
};

export const updateSharedTransaction = async (userId, transactionId, payload) => {
    const oldTransaction = await findTransactionOrFail(transactionId);
    const sharedSavings = await findSharedSavingsOrFail(oldTransaction.shared_savings_id);
    await findMemberOrFail(userId, sharedSavings.id);

    const newTransaction = {
        type: payload.type ?? oldTransaction.type,
        amount: payload.amount ?? oldTransaction.amount,
        description: payload.description ?? oldTransaction.description
    };

    const { data, error } = await supabase.rpc("update_shared_transaction_rpc", {
        p_user_id: userId,
        p_transaction_id: transactionId,
        p_type: newTransaction.type,
        p_amount: newTransaction.amount,
        p_description: newTransaction.description
    });

    if (error) {
        throw new AppError(error.message, 400);
    }

    return data;
};

// FIXED: Hanya ada satu deklarasi tunggal untuk deleteSharedTransaction dengan validasi keamanan
export const deleteSharedTransaction = async (userId, transactionId) => {
    const transaction = await findTransactionOrFail(transactionId);
    const sharedSavings = await findSharedSavingsOrFail(transaction.shared_savings_id);
    const member = await findMemberOrFail(userId, sharedSavings.id);

    if (transaction.user_id !== userId && member.role !== "owner") {
        throw new AppError("Anda tidak berhak menghapus transaksi ini.", 403);
    }

    const { data, error } = await supabase.rpc("delete_shared_transaction_rpc", {
        p_transaction_id: transactionId
    });

    if (error) {
        throw new AppError(error.message, 400);
    }

    return data;
};

export const getSharedSavingsStatistics = async (userId, sharedSavingsId) => {
    const sharedSavings = await findSharedSavingsOrFail(sharedSavingsId);
    await findMemberOrFail(userId, sharedSavings.id);

    const [membersResult, transactionsResult] = await Promise.all([
        supabase
            .from(SHARED_MEMBERS_TABLE)
            .select("user_id, role")
            .eq("shared_savings_id", sharedSavings.id),
        supabase
            .from(SHARED_TRANSACTIONS_TABLE)
            .select("user_id, type, amount")
            .eq("shared_savings_id", sharedSavings.id)
    ]);

    const { data: members, error: membersError } = membersResult;
    const { data: transactions, error: transactionsError } = transactionsResult;

    if (membersError) {
        throw new AppError(membersError.message, 500);
    }

    if (transactionsError) {
        throw new AppError(transactionsError.message, 500);
    }

    const memberStats = await Promise.all(
        members.map(async (member) => ({
            user_id: member.user_id,
            name: await getMemberDisplayName(member.user_id),
            role: member.role,
            total_deposit: 0,
            total_withdrawal: 0
        }))
    );

    transactions.forEach((transaction) => {
        const member = memberStats.find((item) => item.user_id === transaction.user_id);

        if (!member) {
            return;
        }

        if (transaction.type === "deposit") {
            member.total_deposit += transaction.amount;
        } else if (transaction.type === "withdrawal") {
            member.total_withdrawal += transaction.amount;
        }
    });

    const progress = sharedSavings.target_amount > 0
        ? Math.round((sharedSavings.current_amount / sharedSavings.target_amount) * 100)
        : 0;

    return {
        target: sharedSavings.target_amount,
        current: sharedSavings.current_amount,
        progress,
        remaining: Math.max(sharedSavings.target_amount - sharedSavings.current_amount, 0),
        members: memberStats
    };
};