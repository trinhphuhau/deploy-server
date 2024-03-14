require("dotenv").config({ path: "./.env" });

const express = require("express");
const app = express();
const port = 3001;
const cors = require("cors");

const model = require("./model");
const async = require("async");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const moment = require("moment");
const saltRounds = 10;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

const orderVNPayRouter = require("./vnpay/order");
const connection = require("./connection");

app.use("/", orderVNPayRouter);

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.send({ message: "Bạn không có quyền" });
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, user) => {
    if (err) return res.send({ message: "Bạn không có quyền" });
    req.userId = user.id;
    next();
  });
}

app.get("/new-book", (req, res) => {
  connection.query(
    "SELECT * FROM books WHERE status = 1 AND deleted_date IS NULL ORDER BY book_id DESC LIMIT 0, 10",
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
  connection.query(
    "SELECT * FROM books INNER JOIN (SELECT SUM(quantity) AS total, book_id FROM orderdetail GROUP BY book_id ORDER BY total DESC LIMIT 0, 10) a ON books.book_id = a.book_id WHERE books.deleted_date IS NULL",
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.get("/categories", (req, res) => {
  connection.query("SELECT * FROM `genres`", (err, result) => {
    if (err) console.log(err);
    else {
      res.json(result);
    }
  });
});

app.get("/get-book-detail", (req, res) => {
  let book_id = req.query.id;
  connection.query(
    "SELECT * FROM books AS b LEFT JOIN genres AS g ON b.genre_id = g.genre_id WHERE b.book_id = ? AND status = 1",
    book_id,
    (err, result) => {
      if (err) console.log(err);
      else {
        res.json(result);
      }
    }
  );
});

app.post("/get-book-rating", (req, res) => {
  let book_id = req.query.id;
  connection.query(
    "SELECT ratings.*, name, image_url FROM ratings, customeraccount WHERE book_id = ? AND ratings.user_id = customeraccount.user_id ORDER BY modified_date DESC LIMIT 0, 10",
    book_id,
    (err, result) => {
      if (err) console.log(err);
      else {
        res.json(result);
      }
    }
  );
});

app.get("/get-city", (req, res) => {
  connection.query("SELECT * FROM `tinhthanhpho`", (err, result) => {
    if (err) console.log(err);
    else {
      res.json(result);
    }
  });
});

app.post("/get-district", (req, res) => {
  let matp = req.body.matp;
  connection.query(
    "SELECT * FROM `quanhuyen` WHERE matp = ?",
    matp,
    (err, result) => {
      if (err) console.log(err);
      else {
        res.json(result);
      }
    }
  );
});

app.post("/get-town", (req, res) => {
  let maqh = req.body.maqh;
  connection.query(
    "SELECT * FROM `xaphuongthitran` WHERE maqh = ?",
    maqh,
    (err, result) => {
      if (err) console.log(err);
      else {
        res.json(result);
      }
    }
  );
});

app.post("/ordering", authenticateToken, (req, res) => {
  const output = [];
  const checkOutput = true;
  if (req.body.user_id === req.userId) {
    const {
      name,
      phone,
      address,
      note,
      totalPrice,
      books,
      user_id,
      shippingFee,
      matp,
      maqh,
      xaid,
      voucher,
      discount,
      payment_method,
    } = req.body;
    connection.query(
      "INSERT INTO `orders` (`user_id`, `name`, `phone`, `address`, `note`, `total_price`, " +
        "`shipping_fee`, `voucher`, `discount`, `matp`, `maqh`, `xaid`, `status_id`, `payment_method`, `paid`) " +
        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)",
      [
        user_id,
        name,
        phone,
        address,
        note,
        totalPrice,
        shippingFee,
        voucher,
        discount,
        matp,
        maqh,
        xaid,
        "cxn",
        payment_method,
      ],
      function (err, result) {
        if (err) {
          console.log(err);
        } else {
          books.forEach((item) => {
            connection.query(
              "INSERT INTO `orderdetail` (`order_id`, `book_id`, `price`, `quantity`) VALUES (?,?,?,?); " +
                "UPDATE inventory SET stock = stock - ? WHERE book_id = ?",
              [
                result.insertId,
                item.book_id,
                item.price,
                item.quantity,
                item.quantity,
                item.book_id,
              ],
              function (err, result) {
                if (err) {
                  console.log(err);
                } else {
                  output.push(result.affectedRows);
                }
              }
            );
          });
          const status_array = ["cxn", "clh", "dvc", "ht", "dh"];
          const time_array = [
            moment(Date.now()).format("YYYY-MM-DD HH:mm:ss"),
            null,
            null,
            null,
            null,
          ];
          for (var i = 0; i < status_array.length; i++) {
            connection.query(
              "INSERT INTO ordertime VALUES (?, ?, ?)",
              [result.insertId, status_array[i], time_array[i]],
              (err, result) => {
                if (err) {
                  console.log(err);
                } else {
                  output.push(result.affectedRows);
                }
              }
            );
          }
          output.forEach((check) => {
            if (check !== 0) {
              checkOutput = false;
            }
          });
          checkOutput === true
            ? res.send({ status: true, message: "Order Successfully Placed" })
            : res.send({ status: false, message: "Order Failed" });
        }
      }
    );
  } else {
    console.log("Vui lòng đăng nhập");
  }
});

app.post("/cancel-order", authenticateToken, (req, res) => {
  if (req.userId) {
    const { order_id } = req.body;
    connection.query(
      "UPDATE orders SET status_id = 'dh' WHERE order_id = ?; " +
        "UPDATE ordertime SET order_time = ? WHERE status_id = 'dh' AND order_id = ?",
      [order_id, moment(Date.now()).format("YYYY-MM-DD HH:mm:ss"), order_id],
      (err, result) => {
        if (err) console.log(err);
        else {
          res.send({ message: "success" });
        }
      }
    );
  } else {
    console.log("Vui lòng đăng nhập");
  }
});

app.post("/register", (req, res) => {
  const { name, username, password } = req.body;
  connection.query(
    "SELECT * FROM customeraccount WHERE username = ?",
    username,
    (err, result) => {
      if (result.length > 0) {
        res.send({ message: "Tên tài khoản đã tồn tại" });
      } else {
        bcrypt.hash(password, saltRounds, function (err, hash) {
          if (err) console.log(err);
          connection.query(
            "INSERT INTO `customeraccount` (name, username, password, status) VALUES (?,?,?,1)",
            [name, username, hash],
            (err, result) => {
              if (err) console.log(err);
              else {
                res.send({ message: "success" });
              }
            }
          );
        });
      }
    }
  );
});

app.post("/add-favorite", (req, res) => {
  const { favorite, username } = req.body;
  let fav = JSON.stringify(favorite);
  fav = fav.replace("[", "");
  fav = fav.replace("]", "");
  // fav = fav.replace(/","/g, ', ')
  connection.query(
    "UPDATE customeraccount SET favorite = (?) WHERE username = ?",
    [fav, username],
    (err, result) => {
      if (err) console.log(err);
      else {
        res.send({ message: "success" });
      }
    }
  );
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  connection.query(
    "SELECT * FROM `customeraccount` WHERE username = ?",
    username,
    (err, result) => {
      if (err) console.log(err);
      if (result.length > 0) {
        bcrypt.compare(password, result[0].password, (err, response) => {
          if (response) {
            const id = result[0].user_id;
            const accessToken = jwt.sign({ id }, process.env.ACCESS_TOKEN, {
              expiresIn: "1d",
            });
            res.send({ accessToken: accessToken, result: result, message: "" });
          } else {
            res.send({ message: "Tài khoản hoặc mật khẩu không hợp lệ" });
          }
        });
      } else {
        res.send({ message: "Tài khoản không tồn tại" });
      }
    }
  );
});

app.post("/change-password", authenticateToken, (req, res) => {
  const { password_old, password_new, user_id } = req.body;
  if (user_id === req.userId) {
    connection.query(
      "SELECT * FROM `customeraccount` WHERE user_id = ?",
      user_id,
      (err, result) => {
        if (err) console.log(err);
        if (result.length > 0) {
          bcrypt.compare(password_old, result[0].password, (err, response) => {
            if (response) {
              bcrypt.hash(password_new, saltRounds, function (err, hash) {
                if (err) console.log(err);
                connection.query(
                  "UPDATE customeraccount SET password = ? WHERE user_id = ?",
                  [hash, user_id],
                  (err, result) => {
                    if (err) console.log(err);
                    else {
                      res.send({ message: "" });
                    }
                  }
                );
              });
              // const id = result[0].user_id;
              // const accessToken = jwt.sign({ id }, process.env.ACCESS_TOKEN, {
              //   expiresIn: "1d",
              // });
              // res.send({ accessToken: accessToken, result: result });
            } else {
              res.send({ message: "Sai mật khẩu cũ" });
            }
          });
        } else {
          res.send({ message: "Tài khoản không tồn tại" });
        }
      }
    );
  }
});

app.post("/change-info", authenticateToken, (req, res) => {
  const { name, phone, address, matp, maqh, xaid, user_id } = req.body;
  if (user_id === req.userId) {
    connection.query(
      "UPDATE customeraccount SET name=?, phone=?, address=?, matp=?, maqh=?, xaid=? WHERE user_id=?",
      [name, phone, address, matp, maqh, xaid, user_id],
      (err, result) => {
        if (err) console.log(err);
        else {
          res.send({ message: "Cập nhật thông tin thành công" });
        }
      }
    );
  } else {
    res.send({ message: "Tài khoản không tồn tại" });
  }
});

app.post("/rate", authenticateToken, (req, res) => {
  const { book_id, rating, review, user_id } = req.body;
  if (user_id === req.userId) {
    const rating_name = `ratings_${rating}`;
    connection.query(
      "INSERT INTO ratings (book_id, user_id, rating, review) VALUES (?,?,?,?); " +
        "UPDATE books SET " +
        rating_name +
        " = " +
        rating_name +
        "+1, work_ratings_count = work_ratings_count+1," +
        "average_rating = (ratings_1*1+ratings_2*2+ratings_3*3+ratings_4*4+ratings_5*5)/work_ratings_count WHERE book_id = ?;",
      [book_id.book_id, user_id, rating, review, book_id.book_id],
      (err, result) => {
        if (err) console.log(err);
        else {
          res.json(result);
        }
      }
    );
  }
});

app.post("/get-user-rating", (req, res) => {
  const book_id = req.query.id;
  const { user_id } = req.body;
  connection.query(
    "SELECT * FROM ratings WHERE book_id = ? AND user_id = ?",
    [book_id, user_id],
    (err, result) => {
      if (err) console.log(err);
      else {
        if (result.length > 0) {
          res.json(result);
        } else {
          res.send([
            {
              book_id: 0,
              user_id: 0,
              rating: 0,
              review: "",
            },
          ]);
        }
      }
    }
  );
});

app.post("/get-category-total-page", (req, res) => {
  const genre_id = req.body.genre_id;
  connection.query(
    "SELECT COUNT(*) as totalCount FROM books, genres WHERE books.genre_id = genres.genre_id AND books.genre_id = ? AND status = 1 AND deleted_date IS NULL",
    [genre_id],
    (err, result) => {
      if (err) console.log(err);
      else {
        if (result.length > 0) {
          const totalPage = Math.ceil(result[0].totalCount / 12);
          res.json(totalPage);
        }
      }
    }
  );
});

app.post("/get-category-data", (req, res) => {
  const genre_id = req.body.genre_id;
  const limit = 12;
  let page = 1;
  if (req.body.page !== null) {
    page = req.body.page;
  }
  if (req.body.page <= 0) {
    page = 1;
  }
  const start = (page - 1) * limit;
  connection.query(
    "SELECT * FROM books, genres WHERE books.genre_id = genres.genre_id AND books.genre_id = ? AND status = 1 AND deleted_date IS NULL LIMIT ?, ?",
    [genre_id, start, limit],
    (err, result) => {
      if (err) console.log(err);
      else {
        if (result.length > 0) {
          res.json({ books: result });
        }
      }
    }
  );
});

app.post("/get-total-search", (req, res) => {
  const query = req.query.q;
  connection.query(
    "SELECT COUNT(*) as totalCount FROM books WHERE title LIKE ? AND status = 1 AND deleted_date IS NULL",
    `%${query}%`,
    (err, result) => {
      if (err) console.log(err);
      else {
        if (result.length > 0) {
          res.json(result);
        }
      }
    }
  );
});

app.post("/search", (req, res) => {
  const query = req.body.q;
  const totalPage = req.body.totalPage;
  const limit = 12;
  let page = 1;
  if (req.body.page !== null) {
    page = req.body.page;
  }
  if (req.body.page <= 0) {
    page = 1;
  }
  const start = (page - 1) * limit;
  connection.query(
    "SELECT * FROM books WHERE title LIKE ? AND status = 1 AND deleted_date IS NULL LIMIT ?, 12",
    [`%${query}%`, start],
    (err, result) => {
      if (err) console.log(err);
      else {
        if (result.length > 0) {
          res.json(result);
        }
      }
    }
  );
});

app.post("/recommend", (req, res) => {
  let { userId, favorite } = req.body;
  if (Number(userId) > 53424 || Number(userId) < 0) {
    connection.query(
      "SELECT * FROM books WHERE genre_id IN (" +
        favorite +
        ") ORDER BY book_id DESC LIMIT 0, 12",
      (err, result) => {
        if (err) console.log(err);
        else {
          if (result.length > 0) {
            res.json(result);
          }
        }
      }
    );
  } else {
    model.recommend(userId).then((response) => {
      connection.query(
        "SELECT * FROM books WHERE book_id IN (" +
          connection.escape(response) +
          ") AND status = 1 AND deleted_date IS NULL",
        (err, result) => {
          if (err) console.log(err);
          else {
            if (result.length > 0) {
              res.json(result);
            }
          }
        }
      );
    });
  }
});

app.get("/get-recommend-content-based", (req, res) => {
  connection.query(
    "SELECT * FROM books ORDER BY book_id DESC LIMIT 0, 5",
    (err, result) => {
      if (err) console.log(err);
      else {
        if (result.length > 0) {
          res.json({ title: "Sách mới", data: result });
        }
      }
    }
  );
});

//Order History
app.get("/get-order-status", (req, res) => {
  connection.query("SELECT * FROM orderstatus ORDER BY id", (err, result) => {
    if (err) console.log(err);
    else {
      if (result.length > 0) {
        res.json(result);
      }
    }
  });
});

app.post("/get-total-order-history", (req, res) => {
  let { user_id, status_id } = req.body;
  if (status_id === "all") status_id = "%%";
  connection.query(
    "SELECT COUNT(*) AS totalCount FROM orders WHERE user_id=? AND status_id LIKE ?",
    [user_id, status_id],
    (err, result) => {
      if (err) console.log(err);
      else {
        if (result.length > 0) {
          res.json(result);
        }
      }
    }
  );
});

app.post("/get-order-history", (req, res) => {
  let { user_id, status_id, page } = req.body;
  let data = [];
  let details = [];
  const limit = 5;
  const start = (page - 1) * limit;
  if (status_id === "all") status_id = "%%";
  connection.query(
    "SELECT * FROM orders WHERE user_id=? AND status_id LIKE ? ORDER BY order_id DESC LIMIT ?, ?",
    [user_id, status_id, start, limit],
    async (err, result) => {
      if (err) console.log(err);
      else {
        if (result.length > 0) {
          data = result;
          async.forEach(
            result,
            function (data, cb) {
              connection.query(
                "SELECT orderdetail.*, books.* FROM orders, orderdetail, books WHERE orders.order_id = ? AND orders.order_id = orderdetail.order_id AND books.book_id = orderdetail.book_id",
                [data.order_id],
                (err, detail) => {
                  if (err) console.log(err);
                  else {
                    details.push(detail);
                    cb();
                  }
                }
              );
            },
            function (err) {
              res.json({ orderHistory: data, details: details });
            }
          );
        } else {
          res.json({ orderHistory: data, details: details });
        }
      }
    }
  );
});

app.post("/get-order-detail", (req, res) => {
  let { order_id } = req.body;
  connection.query(
    "SELECT * FROM orders, orderstatus, ordertime, " +
      "(SELECT tinhthanhpho.name AS tp_name, orders.matp FROM orders LEFT JOIN tinhthanhpho ON orders.matp = tinhthanhpho.matp) tp, " +
      "(SELECT quanhuyen.name AS qh_name, orders.maqh FROM orders LEFT JOIN quanhuyen ON orders.maqh = quanhuyen.maqh) qh, " +
      "(SELECT xaphuongthitran.name AS tt_name, orders.xaid FROM orders LEFT JOIN xaphuongthitran ON orders.xaid = xaphuongthitran.xaid) tt " +
      "WHERE orders.matp = tp.matp AND orders.maqh = qh.maqh AND orders.xaid = tt.xaid AND orders.order_id = ? AND orders.status_id = orderstatus.status_id " +
      "AND orders.order_id = ordertime.order_id GROUP BY orders.order_id, ordertime.status_id ORDER BY orderstatus.status_id DESC",
    [order_id],
    (err, result) => {
      if (err) console.log(err);
      else {
        if (result.length > 0) {
          connection.query(
            "SELECT orderdetail.*, books.* FROM orders, orderdetail, books WHERE orders.order_id = ? AND orders.order_id = orderdetail.order_id AND books.book_id = orderdetail.book_id",
            [order_id],
            (err, detail) => {
              if (err) console.log(err);
              else {
                res.json({ order: result, details: detail });
              }
            }
          );
        } else {
          res.json({ message: "nope" });
        }
      }
    }
  );
});

app.get("/check-voucher", (req, res) => {
  const voucher = req.query.voucher;
  connection.query(
    "SELECT * FROM promotions WHERE voucher = ?",
    voucher,
    (err, result) => {
      if (result.length > 0) {
        res.json({ voucher: result, message: "" });
      } else {
        res.json({
          voucher: {
            created_date: "0000-00-00",
            expired_date: "0000-00-00",
            status: 0,
            voucher: "",
            voucher_count: 0,
            voucher_type: "",
            voucher_value: 0,
          },
          message: "Mã giảm giá không hợp lệ",
        });
      }
    }
  );
});

// Trang admin
const dashboardRouter = require("./routers/admin/dashboard");
const productRouter = require("./routers/admin/product");
const inventoryRouter = require("./routers/admin/inventory");
const orderRouter = require("./routers/admin/order");
const reviewRouter = require("./routers/admin/review");
const customerRouter = require("./routers/admin/customer");
const staffRouter = require("./routers/admin/staff");
const promotionRouter = require("./routers/admin/promotion");
const messageRouter = require("./routers/admin/message");

app.use("/admin/dashboard", dashboardRouter);
app.use("/admin/product", productRouter);
app.use("/admin/inventory", inventoryRouter);
app.use("/admin/order", orderRouter);
app.use("/admin/review", reviewRouter);
app.use("/admin/customer", customerRouter);
app.use("/admin/staff", staffRouter);
app.use("/admin/promotion", promotionRouter);
app.use("/admin/message", messageRouter);

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  connection.query(
    "SELECT * FROM `staffs` WHERE username = ?",
    username,
    (err, result) => {
      if (err) console.log(err);
      if (result.length > 0) {
        bcrypt.compare(password, result[0].password, (err, response) => {
          if (response) {
            const id = result[0].user_id;
            const accessToken = jwt.sign({ id }, process.env.ACCESS_TOKEN, {
              expiresIn: "1d",
            });
            res.send({ accessToken: accessToken, result: result, message: "" });
          } else {
            res.send({ message: "Tài khoản hoặc mật khẩu không hợp lệ" });
          }
        });
      } else {
        res.send({ message: "Tài khoản không tồn tại" });
      }
    }
  );
});

app.listen(process.env.PORT || port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
