import { supabase } from "../config/supabase.js";

export const register = async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json({
    message: 'Register berhasil. Silakan cek email jika konfirmasi email aktif.',
    data,
  });
};

export const login =async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return res.status(400).json({ error: error.message });

  res.json({
    message: 'Login sukses!',
    token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
    user: data.user,
  });
};

export const refresh = async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token wajib diisi.' });
  }

  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({
      message: 'Token berhasil diperbarui.',
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const logout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Logout berhasil. Hapus token dari client.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};