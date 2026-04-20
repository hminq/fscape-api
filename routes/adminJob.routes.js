const express = require('express');
const router = express.Router();
const authJwt = require('../middlewares/authJwt');
const requireRoles = require('../middlewares/requireRoles');

const contractSignatureExpiry = require('../jobs/contractSignatureExpiry.job');
const bookingExpiry = require('../jobs/bookingExpiry.job');
const contractExpiringSoon = require('../jobs/contractExpiringSoon.job');
const invoiceGeneration = require('../jobs/invoiceGeneration.job');
const firstRentExpiry = require('../jobs/firstRentExpiry.job');
const signingReminder = require('../jobs/signingReminder.job');
const firstRentReminder = require('../jobs/firstRentReminder.job');
const checkInExpiry = require('../jobs/checkInExpiry.job');
const invoiceOverdue = require('../jobs/invoiceOverdue.job');

const JOB_MAP = {
  contractSignatureExpiry,
  bookingExpiry,
  contractExpiringSoon,
  invoiceGeneration,
  firstRentExpiry,
  signingReminder,
  firstRentReminder,
  checkInExpiry,
  invoiceOverdue,
};

router.get(
  '/',
  authJwt,
  requireRoles('ADMIN'),
  (req, res) => {
    const jobs = Object.keys(JOB_MAP).map((name) => ({ name }));
    res.json({ data: jobs });
  },
);

router.post(
  '/:jobName/trigger',
  authJwt,
  requireRoles('ADMIN'),
  async (req, res) => {
    const { jobName } = req.params;
    const job = JOB_MAP[jobName];

    if (!job) {
      return res.status(404).json({ message: `Job "${jobName}" khong ton tai` });
    }

    const start = Date.now();
    try {
      await job.run();
      const duration = Date.now() - start;
      console.log(`[AdminJob] ${jobName} triggered manually by user ${req.user.id} - ${duration}ms`);
      res.json({
        message: `Job "${jobName}" da chay thanh cong`,
        data: { job_name: jobName, duration_ms: duration, status: 'SUCCESS' },
      });
    } catch (err) {
      const duration = Date.now() - start;
      console.error(`[AdminJob] ${jobName} manual trigger failed:`, err.message);
      res.status(500).json({
        message: `Job "${jobName}" that bai: ${err.message}`,
        data: { job_name: jobName, duration_ms: duration, status: 'FAILED' },
      });
    }
  },
);

module.exports = router;
