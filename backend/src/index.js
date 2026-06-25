// index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './config/supabase.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import savingsRoutes from "./routes/savings.routes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

app.use(
    "/api/savings",
    savingsRoutes
);

app.get('/api/transactions', requireAuth, async (req, res) => {
  try {
    const { savings_id, page = 1, limit = 20, sort = 'desc', type } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;
    const sortOrder = sort === 'asc' ? true : false;

    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id);

    if (savings_id) {
      query = query.eq('savings_id', savings_id);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: sortOrder })
      .range(offset, offset + limitNum - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      message: 'Riwayat transaksi berhasil diambil.',
      data: data,
      page: pageNum,
      limit: limitNum,
      total: count,
      total_pages: Math.ceil(count / limitNum),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions/:id', requireAuth, async (req, res) => {
  const transactionId = req.params.id;

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
    }

    res.json({
      message: 'Detail transaksi berhasil diambil.',
      transaction: data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', requireAuth, async (req, res) => {
  const { savings_id, type, amount, description } = req.body;

  // 1. Validasi input awal
  if (!savings_id || !type || !amount) {
    return res.status(400).json({ error: 'savings_id, type (deposit/withdrawal), dan amount wajib diisi.' });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Jumlah uang harus lebih besar dari 0.' });
  }

  try {
    // 2. Ambil data tabungan saat ini untuk cek kepemilikan & saldo
    const { data: savings, error: fetchError } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('id', savings_id)
      .eq('user_id', req.user.id) // Memastikan tabungan ini memang milik user yang login
      .single();

    if (fetchError || !savings) {
      return res.status(404).json({ error: 'Target tabungan tidak ditemukan atau bukan milik Anda.' });
    }

    // 3. Hitung saldo baru berdasarkan jenis transaksi
    let newAmount = Number(savings.current_amount);

    if (type === 'deposit') {
      newAmount += Number(amount);
    } else if (type === 'withdrawal') {
      // Validasi: Cek apakah saldo cukup buat ditarik
      if (newAmount < Number(amount)) {
        return res.status(400).json({ error: 'Saldo tabungan tidak mencukupi untuk penarikan.' });
      }
      newAmount -= Number(amount);
    } else {
      return res.status(400).json({ error: "Tipe transaksi tidak valid. Harus 'deposit' atau 'withdrawal'." });
    }

    // 4. Update saldo di tabel 'savings_goals'
    const { error: updateError } = await supabase
      .from('savings_goals')
      .update({ current_amount: newAmount })
      .eq('id', savings_id);

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    // 5. Catat riwayat transaksi ke tabel 'transactions'
    const { data: transactionData, error: txError } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: req.user.id,
          savings_id,
          type,
          amount: Number(amount),
          description: description || '',
        }
      ])
      .select();

    if (txError) {
      return res.status(400).json({ error: txError.message });
    }

    res.status(201).json({
      message: `Transaksi ${type} berhasil dicatat!`,
      saldo_sekarang: newAmount,
      detail_transaksi: transactionData[0],
    });

  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

app.get('/api/savings/:id/transactions', requireAuth, async (req, res) => {
  const savingsId = req.params.id;

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('savings_id', savingsId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      message: 'Riwayat transaksi untuk target tabungan berhasil diambil.',
      transactions: data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/transactions/:id', requireAuth, async (req, res) => {
  const transactionId = req.params.id;
  const { description } = req.body;

  if (description === undefined) {
    return res.status(400).json({ error: 'Field description harus diisi.' });
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .update({ description })
      .eq('id', transactionId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(400).json({ error: error?.message || 'Gagal memperbarui transaksi.' });
    }

    res.json({
      message: 'Transaksi berhasil diperbarui.',
      transaction: data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
  const transactionId = req.params.id;

  try {
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', req.user.id)
      .single();

    if (transactionError || !transaction) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
    }

    const { data: savings, error: savingsError } = await supabase
      .from('savings_goals')
      .select('current_amount')
      .eq('id', transaction.savings_id)
      .eq('user_id', req.user.id)
      .single();

    if (savingsError || !savings) {
      return res.status(404).json({ error: 'Target tabungan terkait tidak ditemukan.' });
    }

    let adjustedAmount = Number(savings.current_amount);
    if (transaction.type === 'deposit') {
      adjustedAmount -= Number(transaction.amount);
    } else if (transaction.type === 'withdrawal') {
      adjustedAmount += Number(transaction.amount);
    }

    if (adjustedAmount < 0) {
      return res.status(400).json({ error: 'Tidak bisa menghapus transaksi karena akan membuat saldo negatif.' });
    }

    const { error: updateError } = await supabase
      .from('savings_goals')
      .update({ current_amount: adjustedAmount })
      .eq('id', transaction.savings_id);

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', req.user.id);

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    res.json({
      message: 'Transaksi berhasil dihapus.',
      saldo_sekarang: adjustedAmount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: savingsGoals, error: savingsError } = await supabase
      .from('savings_goals')
      .select('current_amount, target_amount')
      .eq('user_id', userId);

    if (savingsError) {
      return res.status(500).json({ error: savingsError.message });
    }

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', userId);

    if (txError) {
      return res.status(500).json({ error: txError.message });
    }

    const total_savings = savingsGoals.reduce((sum, goal) => sum + Number(goal.current_amount), 0);
    const total_target = savingsGoals.reduce((sum, goal) => sum + Number(goal.target_amount), 0);
    const progress = total_target > 0 ? Math.round((total_savings / total_target) * 100) : 0;

    const total_transactions = transactions.length;
    const total_deposit = transactions
      .filter(tx => tx.type === 'deposit')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    const total_withdrawal = transactions
      .filter(tx => tx.type === 'withdrawal')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    res.json({
      message: 'Dashboard berhasil diambil.',
      dashboard: {
        total_savings,
        total_target,
        progress,
        total_transactions,
        total_deposit,
        total_withdrawal,
        num_savings_goals: savingsGoals.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/statistics', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('created_at, type, amount')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const monthlyStats = {};

    transactions.forEach(tx => {
      const date = new Date(tx.created_at);
      const yearMonth = date.toISOString().slice(0, 7);

      if (!monthlyStats[yearMonth]) {
        monthlyStats[yearMonth] = {
          month: yearMonth,
          deposit: 0,
          withdrawal: 0,
        };
      }

      if (tx.type === 'deposit') {
        monthlyStats[yearMonth].deposit += Number(tx.amount);
      } else if (tx.type === 'withdrawal') {
        monthlyStats[yearMonth].withdrawal += Number(tx.amount);
      }
    });

    const per_month = Object.values(monthlyStats);

    res.json({
      message: 'Statistik berhasil diambil.',
      per_month,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

import errorHandler from "./middleware/errorHandler.js";
app.use(errorHandler);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
