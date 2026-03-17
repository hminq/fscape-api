const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const authJwt = require("../middlewares/authJwt");
const validate = require("../middlewares/validateResult");
const validator = require("../validators/payment.validator");

router.post("/create-booking-vnpay", authJwt, validator.createBookingPayment, validate, paymentController.createBookingPaymentUrl);

router.post("/create-invoice-vnpay", authJwt, validator.createInvoicePayment, validate, paymentController.createInvoicePaymentUrl);

router.get("/my", authJwt, paymentController.getMyPayments);

router.get("/vnpay-ipn", paymentController.vnpayIpn);

router.get("/vnpay-return", paymentController.vnpayReturn);

module.exports = router;
