import express from "express";
import { errorHandler } from "./middleware/errorHandler.ts";
import routes from "./routes/index.ts";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(routes);
app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});
app.use(errorHandler);

export function startServer() {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
