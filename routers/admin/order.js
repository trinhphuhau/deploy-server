const connection = require("../../connection");
const express = require("express");
const app = express();
const moment = require("moment");

app.get("/get-order-status", (req, res) => {
  connection.query(
    "SELECT * FROM orderstatus ORDER BY id",
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.json(result);
      }
    }
  );
});

app.post("/get-total-order", (req, res) => {
  const { query, status_id } = req.body;
  connection.query(
    "SELECT COUNT(*) as totalOrder FROM orders WHERE order_id LIKE ? AND status_id LIKE ?",
    [`%${query}%`, `%${status_id}%`],
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.post("/get-orders", (req, res) => {
  const { query, status_id, page } = req.body;
  const limit = 4;
  const start = (page - 1) * limit;
  connection.query(
    "SELECT * FROM orders, orderstatus WHERE orders.order_id LIKE ? AND orders.status_id LIKE ? AND orders.status_id = orderstatus.status_id GROUP BY orders.order_id ORDER BY orders.order_id DESC LIMIT ?, 4",
    [`%${query}%`, `%${status_id}%`, start],
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.post("/change-order-status", (req, res) => {
  const { order_id, status_id } = req.body;
  let query = "";
  if (status_id === "ht") {
    query =
      "UPDATE orders SET status_id = ?, paid = 1 WHERE order_id = ?; " +
      "UPDATE ordertime SET order_time = ? WHERE order_id = ? AND status_id =?;";
  } else {
    query =
      "UPDATE orders SET status_id = ? WHERE order_id = ?; " +
      "UPDATE ordertime SET order_time = ? WHERE order_id = ? AND status_id =?;";
  }
  connection.query(
    query,
    [
      status_id,
      order_id,
      moment(Date.now()).format("YYYY-MM-DD HH:mm:ss"),
      order_id,
      status_id,
    ],
    function (err, result) {
      if (err) {
        console.log(err);
        res.send({ message: "fail" });
      } else {
        res.send({ message: "success" });
      }
    }
  );
});

app.post("/get-order-detail", (req, res) => {
  const { order_id, matp, maqh, xaid } = req.body;
  connection.query(
    "SELECT od.order_id, authors, title, od.price, quantity, image_url, a.name AS tp, b.name AS qh, c.name AS tt FROM books bs, orderdetail od, tinhthanhpho a, quanhuyen b, xaphuongthitran c WHERE od.order_id = ? AND a.matp = ? AND b.maqh = ? AND c.xaid = ? AND bs.book_id = od.book_id",
    [order_id, matp, maqh, xaid],
    function (err, result) {
      if (err) {
        console.log(err);
        res.send({ message: "fail" });
      } else {
        res.json(result);
      }
    }
  );
});

module.exports = app;
