import express from "express";
import routes from "./routes/monitorRoutes.js";
import { getFormattedDate } from "./utils/helpers.js";
import { startCronJobs } from "./services/scheduler.js";

const app = express();

console.log("--- Monitoring System ---");
console.log("Started on: ", getFormattedDate());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/monitors", routes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en: http://localhost:${PORT}/monitors`);
  startCronJobs(  );
});
