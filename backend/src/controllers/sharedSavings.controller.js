import * as sharedSavingsService from "../services/sharedSavings.service.js";
import { success } from "../utils/response.js";

export const createSharedSavings = async (req, res) => {
    const result = await sharedSavingsService.createSharedSavings(
        req.user.id,
        req.validated.body
    );

    return success(res, "Tabungan bersama berhasil dibuat.", result, 201);
};

export const getSharedSavings = async (req, res) => {
    const result = await sharedSavingsService.getSharedSavings(
        req.user.id,
        req.validated.query
    );

    return success(res, "Data tabungan bersama berhasil diambil.", result);
};

export const getSharedSavingsById = async (req, res) => {
    const sharedSavings = await sharedSavingsService.getSharedSavingsById(
        req.user.id,
        req.validated.params.id
    );

    return success(res, "Detail tabungan bersama berhasil diambil.", {
        shared_savings: sharedSavings
    });
};

export const uploadSharedSavingsImage = async (req, res) => {
    const sharedSavings = await sharedSavingsService.uploadSharedSavingsImage(
        req.user.id,
        req.validated.params.id,
        req.file
    );

    return success(res, "Gambar tabungan bersama berhasil diunggah.", {
        shared_savings: sharedSavings
    });
};

export const updateSharedSavings = async (req, res) => {
    const sharedSavings = await sharedSavingsService.updateSharedSavings(
        req.user.id,
        req.validated.params.id,
        req.validated.body
    );

    return success(res, "Tabungan bersama berhasil diperbarui.", {
        shared_savings: sharedSavings
    });
};

export const deleteSharedSavings = async (req, res) => {
    const result = await sharedSavingsService.deleteSharedSavings(
        req.user.id,
        req.validated.params.id
    );

    return success(res, "Tabungan bersama berhasil dihapus.", result);
};

export const joinSharedSavings = async (req, res) => {
    const result = await sharedSavingsService.joinSharedSavings(
        req.user.id,
        req.validated.body
    );

    return success(res, "Berhasil bergabung ke tabungan bersama.", result, 201);
};

export const getSharedSavingsMembers = async (req, res) => {
    const result = await sharedSavingsService.getSharedSavingsMembers(
        req.user.id,
        req.validated.params.id
    );

    return success(res, "Daftar member tabungan bersama berhasil diambil.", result);
};

export const getSharedSavingsStatistics = async (req, res) => {
    const result = await sharedSavingsService.getSharedSavingsStatistics(
        req.user.id,
        req.validated.params.id
    );

    return success(res, "Statistik tabungan bersama berhasil diambil.", result);
};

export const createSharedTransaction = async (req, res) => {
    const result = await sharedSavingsService.createSharedTransaction(
        req.user.id,
        req.validated.body
    );

    return success(res, "Transaksi tabungan bersama berhasil dicatat.", result, 201);
};

export const updateSharedTransaction = async (req, res) => {
    const result = await sharedSavingsService.updateSharedTransaction(
        req.user.id,
        req.validated.params.id,
        req.validated.body
    );

    return success(res, "Transaksi tabungan bersama berhasil diperbarui.", result);
};

export const deleteSharedTransaction = async (req, res) => {
    const result = await sharedSavingsService.deleteSharedTransaction(
        req.user.id,
        req.validated.params.id
    );

    return success(res, "Transaksi tabungan bersama berhasil dihapus.", result);
};
