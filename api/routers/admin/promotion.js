const connection = require("../../connection");
const express = require("express");
const app = express();

app.get("/get-promotion", (req, res) => {
  connection.query(
    "SELECT * FROM promotions ORDER BY created_date ASC",
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

module.exports = app;
