const connection = require("../../connection");
const express = require("express");
const app = express();
const fileUploader = require("../../cloudinary.config");

app.post("/get-total-book", (req, res) => {
  const { query, genre_id } = req.body;
  connection.query(
    "SELECT COUNT(*) as totalBook FROM books WHERE title LIKE ? AND genre_id LIKE ? AND deleted_date IS NULL",
    [`%${query}%`, `%${genre_id}%`],
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.post("/get-books", (req, res) => {
  const { query, genre_id, page, limit } = req.body;
  const start = (page - 1) * limit;
  connection.query(
    "SELECT * FROM books, genres, inventory " +
      "WHERE books.genre_id = genres.genre_id AND title LIKE ? " +
      "AND books.genre_id LIKE ? AND books.book_id = inventory.book_id " +
      "AND deleted_date IS NULL ORDER BY books.book_id DESC LIMIT ?, ?",
    [`%${query}%`, `%${genre_id}%`, start, limit],
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.get("/get-genres", (req, res) => {
  connection.query("SELECT * FROM genres", function (err, result) {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

app.post("/add-new-product", (req, res) => {
  try {
    let upload = fileUploader.single("image");
    upload(req, res, function (err) {
      let filenameImg = "";
      let {
        title,
        authors,
        price_tag,
        price,
        genre_id,
        status,
        image_url,
        publisher,
        description,
      } = req.body;
      if (!req.file) {
        // console.log("No file");
      } else {
        filenameImg = req.file.path;
      }
      if (filenameImg !== "") image_url = filenameImg;
      connection.query(
        "INSERT INTO books (title, authors, price_tag, price, genre_id, image_url, publisher, status, description) VALUES (?,?,?,?,?,?,?,?,?)",
        [
          title,
          authors,
          price_tag,
          price,
          genre_id,
          image_url,
          publisher,
          status,
          description,
        ],
        function (err, result) {
          if (err) {
            console.log(err);
            res.send({ message: "fail" });
          } else {
            connection.query(
              "INSERT INTO inventory VALUES (?, 0, 0)",
              result.insertId,
              function (err, result) {
                if (err) {
                  console.log(err);
                  res.send({ message: "fail" });
                } else {
                  res.send({ message: "success" });
                }
              }
            );
          }
        }
      );
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/update-book-detail", (req, res) => {
  try {
    let upload = fileUploader.single("image");
    upload(req, res, function (err) {
      let filenameImg = "";
      let {
        title,
        authors,
        price_tag,
        price,
        genre_id,
        book_id,
        status,
        image_url,
        publisher,
        description,
      } = req.body;
      if (!req.file) {
        // console.log("No file");
      } else {
        filenameImg = req.file.path;
      }
      if (filenameImg !== "") image_url = filenameImg;
      connection.query(
        "UPDATE books SET title=?, authors=?, price_tag=?, price=?, genre_id=?, image_url=?, publisher=?, status=?, description=? WHERE book_id=?",
        [
          title,
          authors,
          price_tag,
          price,
          genre_id,
          image_url,
          publisher,
          status,
          description,
          book_id,
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
  } catch (err) {
    console.log(err);
  }
});

app.post("/delete-book", (req, res) => {
  const { book_id } = req.body;
  connection.query(
    "UPDATE books SET deleted_date = current_timestamp() WHERE book_id = ?",
    book_id,
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