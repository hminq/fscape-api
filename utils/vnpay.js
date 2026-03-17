const crypto = require("crypto");
const moment = require("moment");
const qs = require("qs");

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();

  keys.forEach((key) => {
    sorted[key] = obj[key];
  });

  return sorted;
}

function createPaymentUrl(params) {

  const createDate = moment().format("YYYYMMDDHHmmss");

  const tmnCode = (process.env.VNP_TMN_CODE || "").trim();
  const returnUrl = (process.env.VNP_RETURN_URL || "").trim();

  let vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Locale: "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: params.txnRef,
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: "other",
    vnp_Amount: Math.round(params.amount * 100),
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: params.ipAddr,
    vnp_CreateDate: createDate
  };

  vnp_Params = sortObject(vnp_Params);

  const signData = qs.stringify(vnp_Params, { encode: true });

  const hashSecret = (process.env.VNP_HASH_SECRET || "").trim();
  const vnpUrl = (process.env.VNP_URL || "").trim();

  const hmac = crypto.createHmac("sha512", hashSecret);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  vnp_Params["vnp_SecureHash"] = signed;

  const paymentUrl = vnpUrl + "?" + qs.stringify(vnp_Params, { encode: true });

  console.log("[VNPay Debug] signData:", signData);
  console.log("[VNPay Debug] ipAddr:", params.ipAddr);
  console.log("[VNPay Debug] signed hash:", signed);

  return paymentUrl;
}
function verifyIpnSignature(vnp_Params) {
  const params = { ...vnp_Params };
  const secureHash = params["vnp_SecureHash"];

  delete params["vnp_SecureHash"];
  delete params["vnp_SecureHashType"];

  const sortedParams = sortObject(params);

  const signData = qs.stringify(sortedParams, { encode: true });

  const hashSecret = (process.env.VNP_HASH_SECRET || "").trim();
  const hmac = crypto.createHmac("sha512", hashSecret);

  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  return secureHash === signed;
}
module.exports = { createPaymentUrl, verifyIpnSignature };