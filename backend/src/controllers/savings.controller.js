// controllers/savings.controller.js

import { success } from "../utils/response.js";
import * as savingsService from "../services/savings.service.js";
import * as transactionService from "../services/transaction.service.js";

export const createSavings = async (req, res) => {
    const savings = await savingsService.createSavings(
        req.user.id,
        req.validated.body
    );

    return success(
        res,
        "Target tabungan berhasil dibuat!",
        { savings },
        201
    );
};

export const getSavings = async (req, res) => {
    const result = await savingsService.getSavings(
        req.user.id,
        req.validated.query
    );

    return success(
        res,
        "Data tabungan berhasil diambil.",
        result
    );
};

export const getSavingsById = async (req, res) => {
    const savings = await savingsService.getSavingsById(
        req.user.id,
        req.validated.params.id
    );

    return success(
        res,
        "Detail tabungan berhasil diambil.",
        { savings }
    );
};

export const updateSavings = async (req, res) => {
    const savings = await savingsService.updateSavings(
        req.user.id,
        req.validated.params.id,
        req.validated.body
    );

    return success(
        res,
        "Target tabungan berhasil diperbarui.",
        { savings }
    );
};

export const uploadSavingsImage = async (req, res) => {
    const savings = await savingsService.uploadSavingsImage(
        req.user.id,
        req.validated.params.id,
        req.file
    );

    return success(
        res,
        "Gambar tabungan berhasil diunggah.",
        { savings }
    );
};

export const deleteSavings = async (req, res) => {
    await savingsService.deleteSavings(
        req.user.id,
        req.validated.params.id
    );

    return success(
        res,
        "Target tabungan berhasil dihapus."
    );
};

export const getTransactionsBySavingsId = async (req, res) => {
    const data = await transactionService.getTransactionsBySavingsId(
        req.user.id,
        req.validated.params.id,
        req.validated.query
    );

    return success(
        res,
        "Riwayat transaksi berhasil diambil.",
        data
    );
};