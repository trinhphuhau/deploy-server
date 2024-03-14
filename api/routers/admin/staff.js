const connection = require("../../connection");
const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const saltRounds = 10;

app.get("/get-jobs", (req, res) => {
  connection.query("SELECT * FROM jobs", function (err, result) {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

app.post("/get-total-staff", (req, res) => {
  const { query } = req.body;
  connection.query(
    "SELECT COUNT(*) as total FROM staffs WHERE name LIKE ? AND deleted_date IS NULL",
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

app.post("/get-staffs", (req, res) => {
  const { query, page } = req.body;
  const limit = 5;
  const start = (page - 1) * limit;
  connection.query(
    "SELECT * FROM staffs, jobs, " +
      "(SELECT tinhthanhpho.name AS tp_name, staffs.matp FROM staffs LEFT JOIN tinhthanhpho ON staffs.matp = tinhthanhpho.matp) tp, " +
      "(SELECT quanhuyen.name AS qh_name, staffs.maqh FROM staffs LEFT JOIN quanhuyen ON staffs.maqh = quanhuyen.maqh) qh, " +
      "(SELECT xaphuongthitran.name AS tt_name, staffs.xaid FROM staffs LEFT JOIN xaphuongthitran ON staffs.xaid = xaphuongthitran.xaid) tt " +
      "WHERE staffs.matp = tp.matp AND staffs.maqh = qh.maqh AND staffs.xaid = tt.xaid AND staffs.name LIKE ? AND staffs.job_id = jobs.job_id " +
      "AND deleted_date IS NULL GROUP BY user_id ORDER BY user_id DESC LIMIT ?, ?",
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

app.post("/delete-staff", (req, res) => {
  const { user_id } = req.body;
  connection.query(
    "UPDATE staffs SET deleted_date = current_timestamp() WHERE user_id = ?",
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

app.post("/change-job", (req, res) => {
  const { user_id, job_id } = req.body;
  connection.query(
    "UPDATE staffs SET job_id = ? WHERE user_id = ?",
    [job_id, user_id],
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

app.post("/change-staff-password", (req, res) => {
  const { user_id, password } = req.body;
  bcrypt.hash(password, saltRounds, function (err, hash) {
    if (err) console.log(err);
    connection.query(
      "UPDATE staffs SET password = ? WHERE user_id = ?",
      [hash, user_id],
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

app.post("/add-new-staff", (req, res) => {
  const { data } = req.body;
  bcrypt.hash(data.password, saltRounds, function (err, hash) {
    if (err) console.log(err);
    connection.query(
      "INSERT INTO staffs (name, phone, address, matp, maqh, xaid, username, password, job_id) VALUES (?,?,?,?,?,?,?,?,?)",
      [
        data.name,
        data.phone,
        data.address,
        data.matp,
        data.maqh,
        data.xaid,
        data.username,
        hash,
        data.job_id,
      ],
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

module.exports = app;
