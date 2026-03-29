const helpers = require("./utils/helpers.js");
const express = require("express");
const app = express();
const routes = require("./routes/monitorRoutes.js");

console.log("--- Monitoring System ---");
console.log("Started on: ", helpers.getFormattedDate()); 

app.use("/status", routes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});