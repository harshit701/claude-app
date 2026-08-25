import express from "express";
import { prisma } from "./config/database.ts";
import { errorHandler } from "./middleware/errorHandler.ts";
import routes from "./routes/index.ts";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(routes);
app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});
app.use(errorHandler);

export function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
      await prisma.$disconnect();
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
