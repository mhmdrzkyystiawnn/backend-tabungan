import * as transactionService from "../services/transaction.service.js";
import { success } from "../utils/response.js";

export const createTransaction = async (req, res) => {
    const result = await transactionService.createTransaction(
        req.user.id,
        req.body
    );

    return success(
        res,
        "Transaksi berhasil dicatat.",
        result,
        201
    );
};

export const getTransactions = async (req, res) => {
    const data = await transactionService.getTransactions(
        req.user.id,
        req.validated.query
    );

    return success(
        res,
        "Riwayat transaksi berhasil diambil.",
        data
    );
};

export const getTransactionById = async (req, res) => {
    const transaction = await transactionService.getTransactionById(
        req.user.id,
        req.validated.params.id
    );

    return success(
        res,
        "Detail transaksi berhasil diambil.",
        {
            transaction
        }
    );
};

export const updateTransaction = async (req, res) => {
    const result = await transactionService.updateTransaction(
        req.user.id,
        req.validated.params.id,
        req.validated.body
    );

    return success(
        res,
        "Transaksi berhasil diperbarui.",
        result
    );
};

export const deleteTransaction = async (req, res) => {
    const result = await transactionService.deleteTransaction(
        req.user.id,
        req.validated.params.id
    );

    return success(
        res,
        "Transaksi berhasil dihapus.",
        result
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