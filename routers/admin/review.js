const connection = require("../../connection");
const express = require("express");
const app = express();

app.post("/get-user-review", (req, res) => {
  const { page } = req.body;
  const limit = 5;
  const start = (page - 1) * limit;
  connection.query(
    "SELECT ratings.*, books.title, books.title, books.book_id, customeraccount.name, customeraccount.user_id, customeraccount.image_url FROM ratings, customeraccount, books WHERE ratings.user_id = customeraccount.user_id AND books.book_id = ratings.book_id LIMIT ?, ?",
    [start, limit],
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.get("/get-total-user-review", (req, res) => {
  connection.query(
    "SELECT COUNT(*) as total FROM ratings",
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.post("/delete-user-review", (req, res) => {
  const { review_id } = req.body;
  connection.query(
    "DELETE FROM ratings WHERE review_id = ?",
    review_id,
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send({ message: "success" });
      }
    }
  );
});

module.exports = app;
