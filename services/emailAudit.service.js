const auditService = require('./audit.service');

const logEmailFailure = async ({
  recipientEmail,
  subject,
  templateKey,
  reason,
  context = {},
  user = null
}) => {
  try {
    await auditService.log({
      user,
      action: 'CREATE',
      entityType: 'email_delivery',
      entityId: null,
      oldValue: null,
      newValue: {
        status: 'FAILED',
        provider: 'nodemailer',
        template_key: templateKey || null,
        recipient_email: recipientEmail || null,
        subject: subject || null,
        error_message: reason || 'Unknown email error',
        context
      }
    });
  } catch (logError) {
    console.error('[EmailAuditService] Failed to write audit log for email failure:', logError);
  }
};

module.exports = {
  logEmailFailure
};
