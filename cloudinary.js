const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "dc9eo14ft",
  api_key: "576534165191878",
  api_secret: "Eha9DpoUE_KCVEN_pUlTdLoZ7Mo"
});
console.log("Cloudinary config loaded");
module.exports = cloudinary;