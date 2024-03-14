const express = require("express");
const app = express();

const mysql = require("mysql");
const moment = require("moment");
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "qlsach",
  multipleStatements: true,
});

var data = null;
var randomKey = null;

app.post("/create_payment_url", function (req, res, next) {
  data = JSON.parse(req.body.data);
  randomKey = req.body.randomKey;

  var ipAddr =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;

  var config = require("config");
  var dateFormat = require("dateformat");

  var tmnCode = config.get("vnp_TmnCode");
  var secretKey = config.get("vnp_HashSecret");
  var vnpUrl = config.get("vnp_Url");
  var returnUrl = config.get("vnp_ReturnUrl");

  var date = new Date();

  var createDate = dateFormat(date, "yyyymmddHHmmss");
  var orderId = dateFormat(date, "HHmmss");
  var amount = req.body.amount;
  var bankCode = req.body.bankCode;

  var orderInfo = req.body.orderDescription;
  var orderType = req.body.orderType;
  var locale = req.body.language;
  if (locale === null || locale === "") {
    locale = "vn";
  }
  var currCode = "VND";
  var vnp_Params = {};
  vnp_Params["vnp_Version"] = "2.1.0";
  vnp_Params["vnp_Command"] = "pay";
  vnp_Params["vnp_TmnCode"] = tmnCode;
  // vnp_Params['vnp_Merchant'] = ''
  vnp_Params["vnp_Locale"] = locale;
  vnp_Params["vnp_CurrCode"] = currCode;
  vnp_Params["vnp_TxnRef"] = orderId;
  vnp_Params["vnp_OrderInfo"] = orderInfo;
  vnp_Params["vnp_OrderType"] = orderType;
  vnp_Params["vnp_Amount"] = amount * 100;
  vnp_Params["vnp_ReturnUrl"] = returnUrl;
  vnp_Params["vnp_IpAddr"] = ipAddr;
  vnp_Params["vnp_CreateDate"] = createDate;
  if (bankCode !== null && bankCode !== "") {
    vnp_Params["vnp_BankCode"] = bankCode;
  }

  vnp_Params = sortObject(vnp_Params);

  var querystring = require("qs");
  var signData = querystring.stringify(vnp_Params, { encode: false });
  var crypto = require("crypto");
  var hmac = crypto.createHmac("sha512", secretKey);
  var signed = hmac.update(new Buffer(signData, "utf-8")).digest("hex");
  vnp_Params["vnp_SecureHash"] = signed;
  vnpUrl += "?" + querystring.stringify(vnp_Params, { encode: false });

  res.redirect(vnpUrl);
});

app.get("/vnpay_return", function (req, res, next) {
  var vnp_Params = req.query;

  var secureHash = vnp_Params["vnp_SecureHash"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  vnp_Params = sortObject(vnp_Params);

  var config = require("config");
  var tmnCode = config.get("vnp_TmnCode");
  var secretKey = config.get("vnp_HashSecret");

  var querystring = require("qs");
  var signData = querystring.stringify(vnp_Params, { encode: false });
  var crypto = require("crypto");
  var hmac = crypto.createHmac("sha512", secretKey);
  var signed = hmac.update(new Buffer(signData, "utf-8")).digest("hex");

  if (secureHash === signed) {
    const output = [];
    const checkOutput = true;
    if (vnp_Params["vnp_ResponseCode"] === "00") {
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
      } = data;
      connection.query(
        "INSERT INTO `orders` (`user_id`, `name`, `phone`, `address`, `note`, `total_price`, " +
          "`shipping_fee`, `voucher`, `discount`, `matp`, `maqh`, `xaid`, " +
          "`status_id`, `payment_method`, paid) " +
          "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)",
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
            const session = require("express-session");
            app.use(
              session({
                secret: "mySecret",
                resave: false,
                saveUninitialized: false,
              })
            );
            output.forEach((check) => {
              if (check !== 0) {
                checkOutput = false;
              }
            });
            checkOutput === true;
          }
        }
      );
      res.redirect("https://book-lovers-13.netlify.app/?success=" + randomKey);
    } else {
      res.redirect("https://book-lovers-13.netlify.app/?failed=" + randomKey);
    }
  } else {
    res.redirect("https://book-lovers-13.netlify.app/?failed=" + randomKey);
  }
});

app.get("/vnpay_ipn", function (req, res, next) {
  var vnp_Params = req.query;
  var secureHash = vnp_Params["vnp_SecureHash"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  vnp_Params = sortObject(vnp_Params);
  var config = require("config");
  var secretKey = config.get("vnp_HashSecret");
  var querystring = require("qs");
  var signData = querystring.stringify(vnp_Params, { encode: false });
  var crypto = require("crypto");
  var hmac = crypto.createHmac("sha512", secretKey);
  var signed = hmac.update(new Buffer(signData, "utf-8")).digest("hex");

  if (secureHash === signed) {
    var orderId = vnp_Params["vnp_TxnRef"];
    var rspCode = vnp_Params["vnp_ResponseCode"];
    res.status(200).json({ RspCode: "00", Message: "success" });
  } else {
    res.status(200).json({ RspCode: "97", Message: "Fail checksum" });
  }
});

function sortObject(obj) {
  var sorted = {};
  var str = [];
  var key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

module.exports = app;
