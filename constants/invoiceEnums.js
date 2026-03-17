// constants/invoiceEnums.js
// Domain enums for invoice separation and request billing tracking.

const INVOICE_TYPE = Object.freeze({
  RENT: 'RENT',
  SERVICE: 'SERVICE',
  SETTLEMENT: 'SETTLEMENT',
});

const REQUEST_SERVICE_BILLING_STATUS = Object.freeze({
  UNBILLED: 'UNBILLED',
  INVOICED: 'INVOICED',
  SETTLED: 'SETTLED',
});

module.exports = {
  INVOICE_TYPE,
  REQUEST_SERVICE_BILLING_STATUS,
};
