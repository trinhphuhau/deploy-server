const connection = require("../../connection");
const express = require("express");
const app = express();

app.get("/get-receipt", (req, res) => {
  connection.query("SELECT * FROM `receipts`", function (err, result) {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

app.post("/stock-in", (req, res) => {
  const { receiptInfo, receipt } = req.body;
  let total = 0;
  for (var i = 0; i < receipt.length; i++) {
    total += receipt[i].quantity;
  }
  connection.query(
    "INSERT INTO receipts (`receipt_id`, `total`, `date`) VALUES (?, ?, ?)",
    [receiptInfo.receipt_id, total, receiptInfo.date],
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        receipt.map((item) => {
          connection.query(
            "INSERT INTO receiptdetail VALUES (?,?,?); UPDATE inventory SET total = total + ?, stock = stock + ? WHERE book_id = ?",
            [
              receiptInfo.receipt_id,
              item.book_id,
              item.quantity,
              item.quantity,
              item.quantity,
              item.book_id,
            ],
            function (err, result) {
              if (err) {
                console.log(err);
              } else {
                res.send({ message: "success" });
              }
            }
          );
        });
      }
    }
  );
});

app.get("/get-receipt-detail", (req, res) => {
  const { receipt_id } = req.query;
  connection.query(
    "SELECT * FROM receiptdetail, books WHERE receipt_id = ? AND books.book_id = receiptdetail.book_id",
    receipt_id,
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

module.exports = app;
