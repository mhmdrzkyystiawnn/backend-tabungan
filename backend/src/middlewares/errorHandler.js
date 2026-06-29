import { fail } from "../utils/response.js";

const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== "production";
  
  if (isDev) console.error(err);
  const message = err.isOperational ? err.message : "Terjadi kesalahan pada server.";
  return fail(res, message, err.statusCode || 500);
};
export default errorHandler;