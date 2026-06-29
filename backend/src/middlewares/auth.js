// middleware/auth.js
import { createSupabaseClientWithToken, supabase } from '../config/supabase.js';

export const requireAuth = async (req, res, next) => {
  // 1. Ambil header Authorization dari request
  const authHeader = req.headers.authorization;

  // 2. Cek apakah header ada dan formatnya benar ("Bearer <TOKEN>")
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Akses ditolak. Token tidak ditemukan atau format salah.' 
    });
  }

  // 3. Potong string untuk mengambil token-nya saja
  const token = authHeader.split(' ')[1];

  try {
    // 4. Verifikasi token langsung ke Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    // 5. Jika token tidak valid atau error, tolak request
    if (error || !user) {
      return res.status(401).json({ 
        error: 'Token tidak valid atau sudah kedaluwarsa.' 
      });
    }

    // 6. Jika valid, simpan data user ke dalam objek `req`
    // Ini sangat berguna agar controller kita tahu SIAPA user yang sedang mengakses
    req.user = user;
    req.token = token; // Simpan token untuk digunakan di endpoint yang butuh session
    req.supabase = createSupabaseClientWithToken(token);

    // 7. Lanjutkan ke proses berikutnya (Controller / Route)
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Terjadi kesalahan pada server internal.' });
  }
};