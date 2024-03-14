const connection = require("../../connection");
const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const saltRounds = 10;

app.post("/get-total-customer", (req, res) => {
  const { query } = req.body;
  connection.query(
    "SELECT COUNT(*) as total FROM customeraccount WHERE username LIKE ? AND deleted_date IS NULL",
    `%${query}%`,
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.post("/get-customers", (req, res) => {
  const { query, page } = req.body;
  const limit = 5;
  const start = (page - 1) * limit;
  connection.query(
    "SELECT * FROM customeraccount, " +
      "(SELECT tinhthanhpho.name AS tp_name, customeraccount.matp FROM customeraccount LEFT JOIN tinhthanhpho ON customeraccount.matp = tinhthanhpho.matp) tp, " +
      "(SELECT quanhuyen.name AS qh_name, customeraccount.maqh FROM customeraccount LEFT JOIN quanhuyen ON customeraccount.maqh = quanhuyen.maqh) qh, " +
      "(SELECT xaphuongthitran.name AS tt_name, customeraccount.xaid FROM customeraccount LEFT JOIN xaphuongthitran ON customeraccount.xaid = xaphuongthitran.xaid) tt " +
      "WHERE customeraccount.matp = tp.matp AND customeraccount.maqh = qh.maqh AND customeraccount.xaid = tt.xaid AND username LIKE ? AND deleted_date IS NULL GROUP BY username LIMIT ?, ?",
    [`%${query}%`, start, limit],
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

app.post("/change-customer-password", (req, res) => {
  const { username, password } = req.body;
  bcrypt.hash(password, saltRounds, function (err, hash) {
    if (err) console.log(err);
    connection.query(
      "UPDATE customeraccount SET password = ? WHERE username = ?",
      [hash, username],
      (err, result) => {
        if (err) {
          console.log(err);
          res.send({ message: "fail" });
        } else {
          res.send({ message: "success" });
        }
      }
    );
  });
});

app.post("/get-orders-by-customer", (req, res) => {
  const { user_id } = req.body;
  connection.query(
    "SELECT * FROM orders LEFT JOIN orderstatus ON orders.status_id = orderstatus.status_id WHERE user_id = ? ORDER BY order_id DESC LIMIT 0, 5",
    [user_id],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.json(result);
      }
    }
  );
});

app.post("/delete-customer", (req, res) => {
  const { user_id } = req.body;
  connection.query(
    "UPDATE customeraccount SET deleted_date = current_timestamp() WHERE user_id = ?",
    user_id,
    (err, result) => {
      if (err) {
        console.log(err);
        res.send({ message: "fail" });
      } else {
        res.send({ message: "success" });
      }
    }
  );
});

module.exports = app;
