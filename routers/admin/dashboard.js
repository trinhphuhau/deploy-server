const connection = require("../../connection");
const express = require("express");
const app = express();

app.get("/get-total-order", (req, res) => {
  connection.query(
    "SELECT COUNT(*) as totalOrder FROM orders",
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.get("/get-total-customer", (req, res) => {
  connection.query(
    "SELECT COUNT(*) as totalCustomer FROM customeraccount",
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.get("/get-total-price", (req, res) => {
  connection.query(
    "SELECT SUM(total_price+shipping_fee) AS totalPrice FROM orders WHERE status_id <> 'dh';",
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.get("/get-total-product", (req, res) => {
  connection.query(
    "SELECT COUNT(*) AS totalProduct FROM books;",
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.get("/get-total-notConfirmBook", (req, res) => {
  connection.query(
    "SELECT COUNT(*) AS totalNotConfirmBook FROM books WHERE status = 0 AND deleted_date IS NULL;",
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.get("/get-total-success-order", (req, res) => {
  connection.query(
    "SELECT COUNT(*) AS totalSuccessOrder FROM orders WHERE status_id = 'ht'",
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.get("/get-total-cancel-order", (req, res) => {
  connection.query(
    "SELECT COUNT(*) AS totalCancelOrder FROM orders WHERE status_id = 'dh'",
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.get("/get-total-book", (req, res) => {
  connection.query(
    "SELECT SUM(total) AS totalBook FROM inventory",
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.get("/get-total-sold-book", (req, res) => {
  connection.query(
    "SELECT SUM(total)-SUM(stock) AS totalSoldBook FROM inventory",
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.get("/get-total-out-of-book", (req, res) => {
  connection.query(
    "SELECT COUNT(*) AS totalOutOfStock FROM inventory, books WHERE inventory.book_id = books.book_id AND stock = 0 AND status = 1 AND deleted_date IS NULL",
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.get("/best-selling", (req, res) => {
  const { limit } = req.query;
  connection.query(
    "SELECT * FROM books " +
      "INNER JOIN (SELECT SUM(quantity) AS total, book_id FROM orderdetail " +
      "GROUP BY book_id ORDER BY total DESC LIMIT 0, ?) a ON books.book_id = a.book_id " +
      "INNER JOIN genres ON books.genre_id = genres.genre_id " +
      "WHERE books.deleted_date IS NULL",
    Number(limit),
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.get("/recent-order", (req, res) => {
  const { limit } = req.query;
  connection.query(
    "SELECT *, SUM(quantity) AS total_quantity FROM orders, ordertime, orderdetail "+
      "WHERE orders.order_id = ordertime.order_id AND ordertime.status_id = 'cxn' "+
      "AND orders.order_id = orderdetail.order_id " +
      "ORDER BY order_time DESC LIMIT ?",
      // "GROUP BY ordertime.order_id ORDER BY order_time DESC LIMIT ?",
    Number(limit),
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.get("/chart-day", (req, res) => {
  connection.query(
    "SELECT 24-hour(order_time) AS time, COUNT(*) AS total FROM orders, ordertime " +
      "WHERE orders.order_id = ordertime.order_id AND order_time >= now() - INTERVAL 1 DAY " +
      "AND ordertime.status_id = 'cxn' GROUP BY hour(order_time)",
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
