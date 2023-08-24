const express = require("express");
const cors = require("cors");
const app = express();
const { apiCompare } = require("./controllers/apiCompare.js");

require("dotenv").config();

// setting up morgan
const logger = require("morgan");
app.use(logger("dev"));

const PORT = process.env.PORT || 5000;
app.use(
  cors({
    origin: "*",
  })
);

// built-in middleware function that helps to convert the body of incoming requests into JSON format.
app.use(express.json());

app.post("/compare", apiCompare);
app.get("/", function (req, res) {
  res.send("Welcome 🙌 to the api compare server");
});

app.listen(PORT, function () {
  console.log(`Sever is running on port ${PORT}`);
});
