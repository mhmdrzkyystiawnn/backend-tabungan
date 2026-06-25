// index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './config/supabase.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get('/api/profile', requireAuth, async (req, res) => {
  res.json({
    message: 'Profil user berhasil diambil.',
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.user_metadata?.name,
      username: req.user.user_metadata?.username,
      avatar: req.user.user_metadata?.picture,
      role: req.user.app_metadata?.role || 'user',
    },
  });
});

app.put('/api/profile', requireAuth, async (req, res) => {
  const { name, avatar, username } = req.body;

  if (!name && !avatar && !username) {
    return res.status(400).json({ error: 'Minimal salah satu field (name, avatar, username) harus diisi.' });
  }

  try {
    const updates = { data: {} };
    if (name) updates.data.name = name;
    if (avatar) updates.data.picture = avatar;
    if (username) updates.data.username = username;

    const { data, error } = await supabase.auth.updateUser(updates);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Profil berhasil diperbarui.',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
        avatar: data.user.user_metadata?.picture,
        username: data.user.user_metadata?.username,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/profile/password', requireAuth, async (req, res) => {
  const { old_password, new_password } = req.body;

  if (!old_password || !new_password) {
    return res.status(400).json({ error: 'old_password dan new_password wajib diisi.' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
  }

  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: old_password,
    });

    if (signInError) {
      return res.status(401).json({ error: 'Password lama salah.' });
    }

    const { data, error } = await supabase.auth.updateUser({
      password: new_password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Password berhasil diubah. Silakan login kembali dengan password baru.',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/savings', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, keyword } = req.query;
    const searchTerm = search || keyword;

    let query = supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId);

    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      message: 'Data tabungan berhasil diambil.',
      savings: data,
      total: data.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk membuat target tabungan baru
app.post('/api/savings', requireAuth, async (req, res) => {
  const { name, target_amount } = req.body;
  
  // Ambil ID user dari middleware requireAuth (req.user)
  const userId = req.user.id; 

  // Validasi input sederhana
  if (!name || !target_amount) {
    return res.status(400).json({ error: 'Nama tabungan dan target jumlah harus diisi.' });
  }

  try {
    // Masukkan data ke tabel 'savings_goals' di Supabase
    const { data, error } = await supabase
      .from('savings_goals')
      .insert([
        { 
          user_id: userId, // Pemilik tabungan
          name: name, 
          target_amount: Number(target_amount),
          current_amount: 0 // Saldo awal otomatis 0
        }
      ])
      .select(); // Mengembalikan data yang baru saja dimasukkan

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Target tabungan berhasil dibuat!',
      data: data[0],
    });

  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

app.get('/api/savings/:id', requireAuth, async (req, res) => {
  const savingsId = req.params.id;

  try {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('id', savingsId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Target tabungan tidak ditemukan.' });
    }

    res.json({
      message: 'Detail target tabungan berhasil diambil.',
      savings: data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/savings/:id', requireAuth, async (req, res) => {
  const savingsId = req.params.id;
  const { name, target_amount } = req.body;

  if (!name && target_amount === undefined) {
    return res.status(400).json({ error: 'Minimal salah satu field name atau target_amount harus diisi.' });
  }

  try {
    const updates = {};
    if (name) updates.name = name;
    if (target_amount !== undefined) updates.target_amount = Number(target_amount);

    const { data, error } = await supabase
      .from('savings_goals')
      .update(updates)
      .eq('id', savingsId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(400).json({ error: error?.message || 'Gagal memperbarui target tabungan.' });
    }

    res.json({
      message: 'Target tabungan berhasil diperbarui.',
      savings: data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/savings/:id', requireAuth, async (req, res) => {
  const savingsId = req.params.id;

  try {
    const { error } = await supabase
      .from('savings_goals')
      .delete()
      .eq('id', savingsId)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Target tabungan berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
