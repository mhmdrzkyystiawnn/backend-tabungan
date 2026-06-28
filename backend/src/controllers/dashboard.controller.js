import { success } from "../utils/response.js";
import * as dashboardService from "../services/dashboard.service.js";

export const getDashboard = async (req, res) => {
    const dashboard = await dashboardService.getDashboard(req.user.id);

    return success(
        res,
        "Dashboard berhasil diambil.",
        { dashboard }
    );
};

export const getStatistics = async (req, res) => {
    const statistics = await dashboardService.getStatistics(req.user.id);

    return success(
        res,
        "Statistik berhasil diambil.",
        statistics
    );
};

export const getRecentTransactions = async (req, res) => {
    // PERBAIKAN BUG #5: Menggunakan req.validated.query, bukan req.query mentah
    const recentTransactions = await dashboardService.getRecentTransactions(
        req.user.id,
        req.validated.query?.limit
    );

    return success(
        res,
        "Riwayat transaksi terbaru berhasil diambil.",
        recentTransactions
    );
};

export const getMonthlySummary = async (req, res) => {
    // PERBAIKAN BUG #6: Menggunakan req.validated.query agar data sudah aman dan terformat
    const monthlySummary = await dashboardService.getMonthlySummary(req.user.id, {
        month: req.validated.query?.month,
        savings_id: req.validated.query?.savings_id,
    });

    return success(
        res,
        "Data pemasukan dan pengeluaran per bulan berhasil diambil.",
        monthlySummary
    );
};