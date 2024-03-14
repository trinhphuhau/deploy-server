const connection = require("../../connection");
const express = require("express");
const app = express();

app.get("/get-total-messages", (req, res) => {
  connection.query("SELECT COUNT(*) AS totalMessage FROM messages WHERE deleted_date IS NULL", function (err, result) {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

app.get("/get-messages", (req, res) => {
  connection.query("SELECT * FROM messages WHERE deleted_date IS NULL", function (err, result) {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

app.post("/add-new-message", (req, res) => {
  const { user_id, message } = req.body;
  connection.query(
    "INSERT INTO messages (user_id, message) VALUES (?, ?)",
    [user_id, message],
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

app.post("/delete-message", (req, res) => {
  const { message_id } = req.body;
  connection.query(
    "UPDATE messages SET deleted_date = current_timestamp() WHERE message_id = ?",
    message_id,
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
