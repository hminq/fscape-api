const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const authJwt = require('../middlewares/authJwt');
const requireRoles = require('../middlewares/requireRoles');
const validate = require('../middlewares/validateResult');
const { ROLES } = require('../constants/roles');
const validator = require('../validators/booking.validator');

router.post('/', authJwt, requireRoles(ROLES.CUSTOMER, ROLES.RESIDENT), validator.create, validate, bookingController.createBooking);

router.get('/my', authJwt, requireRoles(ROLES.CUSTOMER, ROLES.RESIDENT), bookingController.getMyBookings);

router.get('/:id', authJwt, validator.paramId, validate, bookingController.getBookingById);

module.exports = router;
