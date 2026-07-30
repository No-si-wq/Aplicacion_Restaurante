// server.ts
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { ordersRouter } from "./routes/orders.routes";
import { registerOrderEvents } from "./socket/orderEvents";
import { tablesRouter } from "./routes/tables.routes";
import { productsRouter } from "./routes/products.routes";
import categoriesRouter from "./routes/categories.routes";
import reportsRouter from "./routes/reports.routes";
import authRouter from "./routes/auth.routes";
import usersRouter from "./routes/users.routes"

const app = express();
const httpServer = createServer(app);

// server.ts — reemplaza la línea de origins
const origins = (origin: string | undefined, callback: Function) => {
  const isAllowed =
    !origin ||
    (process.env.FRONTEND_URL ?? "http://localhost:5173")
      .split(",")
      .includes(origin) ||
    /^http:\/\/(localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin);

  isAllowed ? callback(null, true) : callback(new Error("CORS bloqueado"));
};

app.use(cors({ origin: origins }));
const io = new Server(httpServer, {
  cors: { origin: origins, methods: ["GET", "POST"] },
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/api/orders", ordersRouter(io));
app.use("/api/tables", tablesRouter);
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);

io.on("connection", (socket) => {
  console.log(`[socket] Cliente conectado: ${socket.id}`);
  registerOrderEvents(io, socket);

  socket.on("disconnect", () => {
    console.log(`[socket] Cliente desconectado: ${socket.id}`);
  });
});

httpServer.listen(Number(process.env.PORT) || 3000, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${process.env.PORT ?? 3000}`);
});