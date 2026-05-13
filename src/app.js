import express from "express";
import path from "path";
import methodOverride from "method-override";

import { fileURLToPath } from "url";

import routes from "./routes/monitorRoutes.js";
import { getFormattedDate } from "./utils/helpers.js";

const app = express();

// Configuración de rutas para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // Usamos path.dirname para evitar errores

console.log("--- Monitoring System ---");
console.log("Started on: ", getFormattedDate());

app.use(express.static(path.join(__dirname, "public")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/monitors", routes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en: http://localhost:${PORT}/monitors`);
});
