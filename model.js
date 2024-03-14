const tf = require("@tensorflow/tfjs-node");
const books = require("./model/web_book_data.json");
TF_CPP_MIN_LOG_LEVEL = 2;

// Load mo hinh
async function loadModel() {
  model = await tf.loadLayersModel("file://model/model.json", false);
}

const book_arr = tf.range(0, books.length);
const book_len = books.length;

exports.recommend = async function recommend(userId) {
  let user = tf.fill([book_len], Number(userId));
  await loadModel();
  // Tien thanh du doan
  pred_tensor = await model.predict([book_arr, user]).reshape([10000]);
  pred = pred_tensor.arraySync();
  let recommendations = [];
  for (let i = 0; i < 12; i++) {
    // Tim sach co du doan cao nhat
    max = pred_tensor.argMax().arraySync();
    // Them ket qua du doan vao danh sach goi y
    recommendations.push(max);
    // Loai ket qua du doan vua tim
    pred.splice(max, 1);
    pred_tensor = tf.tensor(pred);
  }
  // Tra ve danh sach cac book_id co du doan cao nhat
  return recommendations;
};
