// index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './config/supabase.js';
import { requireAuth } from './middlewares/auth.js';
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import savingsRoutes from "./routes/savings.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/profile",
  profileRoutes
);

app.use(
    "/api/savings",
    savingsRoutes
);

app.use(
    "/api/transactions",
    transactionRoutes
);

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

import errorHandler from "./middlewares/errorHandler.js";
app.use(errorHandler);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
