// const cloudinary = require("cloudinary").v2;

// cloudinary.config({
//   cloud_name: "dc9eo14ft",
//   api_key: "576534165191878",
//   api_secret: "Eha9DpoUE_KCVEN_pUlTdLoZ7Mo"
// });

// module.exports = cloudinary;
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.dc9eo14ft,
  api_key: process.env.CLOUD_API_KEY=576534165191878,
  api_secret: process.env.Eha9DpoUE_KCVEN_pUlTdLoZ7Mo
});

module.exports = cloudinary;