const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const authJwt = require("../middlewares/authJwt");
const validate = require("../middlewares/validateResult");
const validator = require("../validators/payment.validator");

router.get("/my", authJwt, paymentController.getMyPayments);

// PayOS routes.
router.post("/create-booking-payos", authJwt, validator.createBookingPayment, validate, paymentController.createBookingPaymentUrlPayOS);

router.post("/create-invoice-payos", authJwt, validator.createInvoicePayment, validate, paymentController.createInvoicePaymentUrlPayOS);

router.post("/payos-webhook", paymentController.payosWebhook);

router.get("/payos-return", paymentController.payosReturn);

module.exports = router;
