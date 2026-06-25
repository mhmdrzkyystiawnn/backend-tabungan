// controllers/savings.controller.js

import { success, fail } from "../utils/response.js";
import * as savingsService from "../services/savings.service.js";

export const createSavings = async (req, res) => {

    const { name, target_amount } = req.body;

    if (!name || !target_amount) {

        return fail(
            res,
            "Nama tabungan dan target jumlah harus diisi."
        );

    }

    const savings = await savingsService.createSavings(
        req.user.id,
        req.body
    );

    return success(

        res,

        "Target tabungan berhasil dibuat!",

        {
            savings
        },

        201

    );

};

export const getSavings = async (req, res) => {

    const result =
        await savingsService.getSavings(

            req.user.id,

            req.query

        );

    return success(

        res,

        "Data tabungan berhasil diambil.",

        result

    );

};

export const getSavingsById = async (req, res) => {

    const savings =
        await savingsService.getSavingsById(
            req.user.id,
            req.params.id
        );

    return success(
        res,
        "Detail tabungan berhasil diambil.",
        {
            savings
        }
    );

};

export const updateSavings = async (req, res) => {

    const { name, target_amount } = req.body;

    if (
        name === undefined &&
        target_amount === undefined
    ) {
        return fail(
            res,
            "Minimal satu field harus diubah."
        );
    }

    const savings =
        await savingsService.updateSavings(
            req.user.id,
            req.params.id,
            req.body
        );

    return success(
        res,
        "Target tabungan berhasil diperbarui.",
        {
            savings
        }
    );

};

export const deleteSavings = async (req, res) => {

    await savingsService.deleteSavings(

        req.user.id,

        req.params.id

    );

    return success(

        res,

        "Target tabungan berhasil dihapus."

    );

};