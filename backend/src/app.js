// index.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import helmet from "helmet";
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './docs/swagger.js';
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import savingsRoutes from "./routes/savings.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import transactionRoutes from "./routes/transaction.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import { sharedSavingsRouter, sharedTransactionRouter } from "./routes/sharedSavings.routes.js";


const app = express();
const corsOptions = {
  origin: ['http://localhost:5173', 'https://tabungankuuuu.vercel.app', 'http://localhost:3000']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(helmet());

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

app.use(
    "/api/dashboard",
    dashboardRoutes
);

app.use(
    "/api/shared-savings",
    sharedSavingsRouter
);

app.use(
    "/api/shared-transactions",
    sharedTransactionRouter
);

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);


app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route tidak ditemukan." });
});
app.use(errorHandler);

export default app;