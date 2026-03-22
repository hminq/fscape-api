const nodemailer = require("nodemailer");
const emailAuditService = require("../services/emailAudit.service");
const { sequelize } = require("../config/db");

if (
  process.env.NODE_ENV !== "test" &&
  (!process.env.MAIL_USER || !process.env.MAIL_PASS)
) {
  throw new Error("MAIL credentials missing");
}

const transporter =
  process.env.NODE_ENV === "test"
    ? null
    : nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });

const FSCAPE_LOGO_URL =
  "https://res.cloudinary.com/dz0rxiivc/image/upload/v1772824029/fscape-logo_qkmcfz.svg";

/**
 * Email template with FScape logo.
 */
const wrapEmailTemplate = (bodyContent) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#011936; padding:24px 32px; text-align:center;">
              <img src="${FSCAPE_LOGO_URL}" alt="FScape" height="40" style="height:40px;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f4f4f5; padding:16px 32px; text-align:center; font-size:12px; color:#71717a;">
              <p style="margin:0;">FScape — Student Housing Platform</p>
              <p style="margin:4px 0 0;">Email này được gửi tự động, vui lòng không trả lời.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const sendMailWithAudit = async ({
  to,
  subject,
  html,
  templateKey,
  context,
}) => {
  try {
    await transporter.sendMail({
      from: `"FScape" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    await emailAuditService.logEmailFailure({
      recipientEmail: to,
      subject,
      templateKey,
      reason: error.message,
      context,
    });
    throw error;
  }
};

// ── Email dedup helpers (prevent duplicate sends across cron cycles) ──
const wasEmailSent = async (templateKey, entityId) => {
  const [results] = await sequelize.query(
    `SELECT id FROM email_logs
     WHERE status = 'SENT'
       AND metadata @> :meta::jsonb
     LIMIT 1`,
    {
      replacements: {
        meta: JSON.stringify({
          template_key: templateKey,
          entity_id: String(entityId),
        }),
      },
      type: sequelize.QueryTypes.SELECT,
    },
  );
  return !!results;
};

const logEmailSent = async (recipientEmail, subject, templateKey, entityId) => {
  await sequelize.query(
    `INSERT INTO email_logs (id, recipient_email, subject, status, sent_at, metadata, created_at)
     VALUES (gen_random_uuid(), :recipientEmail, :subject, 'SENT', NOW(), :meta::jsonb, NOW())`,
    {
      replacements: {
        recipientEmail,
        subject,
        meta: JSON.stringify({
          template_key: templateKey,
          entity_id: String(entityId),
        }),
      },
    },
  );
};

exports.sendOtpMail = async (email, code) => {
  await sendMailWithAudit({
    to: email,
    subject: "Mã xác thực OTP — FScape",
    templateKey: "OTP_VERIFICATION",
    context: { flow: "AUTH" },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#011936;">Mã xác thực OTP</h2>
      <p style="margin:0 0 16px; color:#52525b;">Vui lòng sử dụng mã bên dưới để xác thực tài khoản của bạn:</p>
      <div style="background-color:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px; text-align:center; margin:0 0 16px;">
        <span style="font-size:32px; font-weight:700; letter-spacing:8px; color:#011936;">${code}</span>
      </div>
      <p style="margin:0; color:#71717a; font-size:13px;">Mã này sẽ hết hạn sau 5 phút.</p>
    `),
  });
};

/**
 * Gửi email mời ký hợp đồng cho customer.
 */
/**
 * Gửi email thông báo cho BM rằng customer đã ký, mời BM ký xác nhận.
 */
exports.sendManagerSigningEmail = async (
  email,
  {
    managerName,
    customerName,
    contractNumber,
    roomNumber,
    buildingName,
    signingUrl,
  },
) => {
  await sendMailWithAudit({
    to: email,
    subject: `Hợp đồng ${contractNumber} — Khách hàng đã ký, chờ bạn xác nhận`,
    templateKey: "CONTRACT_MANAGER_SIGNING",
    context: { contractNumber, roomNumber, buildingName },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#011936;">Xin chào ${managerName},</h2>
      <p style="margin:0 0 16px; color:#52525b;">
        Khách hàng <strong>${customerName}</strong> đã ký hợp đồng thuê phòng. Vui lòng xem xét và ký xác nhận để kích hoạt hợp đồng.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; margin:0 0 24px;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hợp đồng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${contractNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Phòng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${roomNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tòa nhà</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${buildingName}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Khách hàng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${customerName}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${signingUrl}" style="display:inline-block; background-color:#011936; color:#ffffff; text-decoration:none; padding:12px 32px; border-radius:6px; font-weight:600; font-size:15px;">
              Xem và ký hợp đồng
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:24px 0 0; color:#71717a; font-size:13px;">
        Vui lòng ký xác nhận trong vòng 24 giờ. Sau thời hạn trên, hợp đồng sẽ tự động hủy.
      </p>
      <p style="margin:8px 0 0; color:#71717a; font-size:13px;">
        Nếu nút không hoạt động, hãy sao chép đường dẫn sau vào trình duyệt:<br/>
        <a href="${signingUrl}" style="color:#2563eb; word-break:break-all;">${signingUrl}</a>
      </p>
    `),
  });
};

/**
 * Gửi email xác nhận hợp đồng đã được kích hoạt cho resident.
 */
exports.sendContractActivatedEmail = async (
  email,
  { customerName, contractNumber, roomNumber, buildingName, startDate },
) => {
  await sendMailWithAudit({
    to: email,
    subject: `Hợp đồng ${contractNumber} — Đã kích hoạt thành công`,
    templateKey: "CONTRACT_ACTIVATED",
    context: { contractNumber, roomNumber, buildingName },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#011936;">Xin chào ${customerName},</h2>
      <p style="margin:0 0 16px; color:#52525b;">
        Hợp đồng thuê phòng của bạn đã được quản lý tòa nhà ký xác nhận và <strong>kích hoạt thành công</strong>.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; margin:0 0 24px;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hợp đồng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${contractNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Phòng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${roomNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tòa nhà</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${buildingName}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Ngày bắt đầu</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#16a34a;">${startDate}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 8px; color:#52525b;">
        Bạn chính thức trở thành cư dân tại <strong>${buildingName}</strong>. Chúc bạn có trải nghiệm tuyệt vời!
      </p>
      <p style="margin:0; color:#71717a; font-size:13px;">
        Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ quản lý tòa nhà qua hệ thống FScape.
      </p>
    `),
  });
};

/**
 * Gửi email thông báo hóa đơn mới cần thanh toán.
 */
exports.sendInvoiceCreatedEmail = async (
  email,
  {
    customerName,
    invoiceNumber,
    invoiceId,
    roomNumber,
    buildingName,
    billingPeriod,
    totalAmount,
    dueDate,
  },
) => {
  const invoiceUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/my-invoices?invoiceId=${invoiceId}`;
  await sendMailWithAudit({
    to: email,
    subject: `Hóa đơn ${invoiceNumber} — Vui lòng thanh toán trước ${dueDate}`,
    templateKey: "INVOICE_CREATED",
    context: { invoiceNumber, roomNumber, buildingName },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#011936;">Xin chào ${customerName},</h2>
      <p style="margin:0 0 16px; color:#52525b;">
        Hóa đơn thuê phòng mới đã được tạo. Vui lòng thanh toán trước hạn để tránh gián đoạn hợp đồng.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef3c7; border:1px solid #fbbf24; border-radius:8px; margin:0 0 24px;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hóa đơn</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Phòng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${roomNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tòa nhà</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${buildingName}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Kỳ thanh toán</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${billingPeriod}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tổng tiền</td>
                <td style="padding:4px 0; text-align:right; font-weight:700; color:#dc2626; font-size:16px;">${totalAmount}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Hạn thanh toán</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#dc2626;">${dueDate}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${invoiceUrl}" style="display:inline-block; background-color:#011936; color:#ffffff; text-decoration:none; padding:12px 32px; border-radius:6px; font-weight:600; font-size:15px;">
              Thanh toán ngay
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:24px 0 0; color:#71717a; font-size:13px;">
        Nếu không thanh toán trước hạn, hợp đồng có thể bị chấm dứt tự động.
      </p>
      <p style="margin:8px 0 0; color:#71717a; font-size:13px;">
        Nếu nút không hoạt động, hãy sao chép đường dẫn sau vào trình duyệt:<br/>
        <a href="${invoiceUrl}" style="color:#2563eb; word-break:break-all;">${invoiceUrl}</a>
      </p>
    `),
  });
};

/**
 * Gửi email mời ký hợp đồng cho customer.
 */
exports.sendContractSigningEmail = async (
  email,
  { customerName, contractNumber, roomNumber, buildingName, signingUrl },
) => {
  await sendMailWithAudit({
    to: email,
    subject: `Hợp đồng ${contractNumber} — Vui lòng ký xác nhận`,
    templateKey: "CONTRACT_CUSTOMER_SIGNING",
    context: { contractNumber, roomNumber, buildingName },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#011936;">Xin chào ${customerName},</h2>
      <p style="margin:0 0 16px; color:#52525b;">
        Hợp đồng thuê phòng của bạn đã được tạo thành công. Vui lòng xem xét và ký xác nhận hợp đồng.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; margin:0 0 24px;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hợp đồng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${contractNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Phòng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${roomNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tòa nhà</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${buildingName}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${signingUrl}" style="display:inline-block; background-color:#011936; color:#ffffff; text-decoration:none; padding:12px 32px; border-radius:6px; font-weight:600; font-size:15px;">
              Xem và ký hợp đồng
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:24px 0 0; color:#71717a; font-size:13px;">
        Bạn có 24 giờ để ký hợp đồng kể từ khi nhận email này. Sau thời hạn trên, hợp đồng sẽ tự động hủy.
      </p>
      <p style="margin:8px 0 0; color:#71717a; font-size:13px;">
        Nếu nút không hoạt động, hãy sao chép đường dẫn sau vào trình duyệt:<br/>
        <a href="${signingUrl}" style="color:#2563eb; word-break:break-all;">${signingUrl}</a>
      </p>
    `),
  });
};

/**
 * Gửi email mời ký hợp đồng gia hạn cho resident.
 */
exports.sendRenewalSigningEmail = async (
  email,
  {
    customerName,
    contractNumber,
    oldContractNumber,
    roomNumber,
    buildingName,
    startDate,
    endDate,
    signingUrl,
  },
) => {
  await sendMailWithAudit({
    to: email,
    subject: `Gia hạn hợp đồng ${contractNumber} — Vui lòng ký xác nhận`,
    templateKey: "CONTRACT_RENEWAL_SIGNING",
    context: { contractNumber, oldContractNumber, roomNumber, buildingName },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#011936;">Xin chào ${customerName},</h2>
      <p style="margin:0 0 16px; color:#52525b;">
        Hợp đồng gia hạn cho phòng <strong>${roomNumber}</strong> tại <strong>${buildingName}</strong> đã được tạo.
        Đây là hợp đồng gia hạn từ hợp đồng <strong>${oldContractNumber}</strong>. Vui lòng xem xét và ký xác nhận.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; margin:0 0 24px;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hợp đồng mới</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${contractNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Gia hạn từ</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${oldContractNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Phòng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${roomNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tòa nhà</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${buildingName}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Ngày bắt đầu</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#16a34a;">${startDate}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Ngày kết thúc</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${endDate}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${signingUrl}" style="display:inline-block; background-color:#011936; color:#ffffff; text-decoration:none; padding:12px 32px; border-radius:6px; font-weight:600; font-size:15px;">
              Ký hợp đồng gia hạn
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:24px 0 0; color:#71717a; font-size:13px;">
        Bạn có 24 giờ để ký hợp đồng kể từ khi nhận email này. Sau thời hạn trên, hợp đồng gia hạn sẽ tự động hủy.
      </p>
      <p style="margin:8px 0 0; color:#71717a; font-size:13px;">
        Nếu nút không hoạt động, hãy sao chép đường dẫn sau vào trình duyệt:<br/>
        <a href="${signingUrl}" style="color:#2563eb; word-break:break-all;">${signingUrl}</a>
      </p>
    `),
  });
};

/**
 * Gửi email thông báo hợp đồng sắp hết hạn cho resident.
 */
exports.sendContractExpiringSoonEmail = async (
  email,
  {
    customerName,
    contractNumber,
    contractId,
    roomNumber,
    buildingName,
    endDate,
  },
) => {
  if (await wasEmailSent("CONTRACT_EXPIRING_SOON", contractId)) return;
  const subject = `Hợp đồng ${contractNumber} — Sắp hết hạn vào ${endDate}`;
  await sendMailWithAudit({
    to: email,
    subject,
    templateKey: "CONTRACT_EXPIRING_SOON",
    context: { contractNumber, roomNumber, buildingName },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#011936;">Xin chào ${customerName},</h2>
      <p style="margin:0 0 16px; color:#52525b;">
        Hợp đồng thuê phòng của bạn sẽ hết hạn vào ngày <strong style="color:#ea580c;">${endDate}</strong>.
        Nếu bạn muốn tiếp tục ở lại, vui lòng gia hạn hợp đồng trên ứng dụng FScape trước khi hết hạn.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff7ed; border:1px solid #fdba74; border-radius:8px; margin:0 0 24px;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hợp đồng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${contractNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Phòng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${roomNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tòa nhà</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${buildingName}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Ngày hết hạn</td>
                <td style="padding:4px 0; text-align:right; font-weight:700; color:#ea580c; font-size:15px;">${endDate}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 8px; color:#52525b;">
        Vui lòng mở ứng dụng FScape và vào mục <strong>Hợp đồng của tôi</strong> để thực hiện gia hạn.
      </p>
      <p style="margin:0; color:#71717a; font-size:13px;">
        Nếu không gia hạn, hợp đồng sẽ tự động kết thúc khi hết hạn và phòng sẽ được trả lại.
      </p>
    `),
  });
  await logEmailSent(email, subject, "CONTRACT_EXPIRING_SOON", contractId);
};

// ── Signing Reminder & Cancellation Emails ──

exports.sendSigningReminderEmail = async (
  email,
  {
    customerName,
    contractNumber,
    contractId,
    roomNumber,
    buildingName,
    hoursRemaining,
    signingUrl,
  },
) => {
  if (await wasEmailSent("CONTRACT_SIGNING_REMINDER", contractId)) return;
  const subject = `Nhắc nhở: Hợp đồng ${contractNumber} — Vui lòng ký trước khi hết hạn`;
  await sendMailWithAudit({
    to: email,
    subject,
    templateKey: "CONTRACT_SIGNING_REMINDER",
    context: { contractNumber, roomNumber, buildingName },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#011936;">Xin chào ${customerName},</h2>
      <p style="margin:0 0 16px; color:#52525b;">
        Hợp đồng thuê phòng của bạn vẫn chưa được ký. Bạn còn khoảng <strong>${hoursRemaining} giờ</strong> để hoàn tất ký kết.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef3c7; border:1px solid #fbbf24; border-radius:8px; margin:0 0 24px;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hợp đồng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${contractNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Phòng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${roomNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tòa nhà</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${buildingName}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${signingUrl}" style="display:inline-block; background-color:#011936; color:#ffffff; text-decoration:none; padding:12px 32px; border-radius:6px; font-weight:600; font-size:15px;">
              Ký hợp đồng
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:24px 0 0; color:#71717a; font-size:13px;">
        Nếu không ký trước hạn, hợp đồng sẽ tự động bị hủy.
      </p>
      <p style="margin:8px 0 0; color:#71717a; font-size:13px;">
        Nếu nút không hoạt động, hãy sao chép đường dẫn sau vào trình duyệt:<br/>
        <a href="${signingUrl}" style="color:#2563eb; word-break:break-all;">${signingUrl}</a>
      </p>
    `),
  });
  await logEmailSent(email, subject, "CONTRACT_SIGNING_REMINDER", contractId);
};

exports.sendSigningUrgentReminderEmail = async (
  email,
  {
    customerName,
    contractNumber,
    contractId,
    roomNumber,
    buildingName,
    signingUrl,
  },
) => {
  if (await wasEmailSent("CONTRACT_SIGNING_URGENT", contractId)) return;
  const subject = `KHẨN: Hợp đồng ${contractNumber} — Chỉ còn 1 giờ để ký`;
  await sendMailWithAudit({
    to: email,
    subject,
    templateKey: "CONTRACT_SIGNING_URGENT",
    context: { contractNumber, roomNumber, buildingName },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#dc2626;">Xin chào ${customerName},</h2>
      <p style="margin:0 0 16px; color:#52525b;">
        <strong style="color:#dc2626;">Chỉ còn chưa đầy 1 giờ</strong> để ký hợp đồng thuê phòng. Nếu không ký kịp, hợp đồng sẽ bị hủy tự động.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2; border:1px solid #fca5a5; border-radius:8px; margin:0 0 24px;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hợp đồng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${contractNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Phòng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${roomNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tòa nhà</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${buildingName}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${signingUrl}" style="display:inline-block; background-color:#dc2626; color:#ffffff; text-decoration:none; padding:12px 32px; border-radius:6px; font-weight:600; font-size:15px;">
              Ký hợp đồng ngay
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:24px 0 0; color:#71717a; font-size:13px;">
        Nếu nút không hoạt động, hãy sao chép đường dẫn sau vào trình duyệt:<br/>
        <a href="${signingUrl}" style="color:#2563eb; word-break:break-all;">${signingUrl}</a>
      </p>
    `),
  });
  await logEmailSent(email, subject, "CONTRACT_SIGNING_URGENT", contractId);
};

exports.sendSigningCancelledEmail = async (
  email,
  { customerName, contractNumber, contractId, roomNumber, buildingName },
) => {
  if (await wasEmailSent("CONTRACT_SIGNING_CANCELLED", contractId)) return;
  const subject = `Hợp đồng ${contractNumber} — Đã bị hủy do hết hạn ký`;
  await sendMailWithAudit({
    to: email,
    subject,
    templateKey: "CONTRACT_SIGNING_CANCELLED",
    context: { contractNumber, roomNumber, buildingName },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#011936;">Xin chào ${customerName},</h2>
      <p style="margin:0 0 16px; color:#52525b;">
        Rất tiếc, hợp đồng thuê phòng của bạn đã bị <strong style="color:#dc2626;">hủy tự động</strong> do hết thời hạn ký kết.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2; border:1px solid #fca5a5; border-radius:8px; margin:0 0 24px;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hợp đồng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${contractNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Phòng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${roomNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tòa nhà</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${buildingName}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 8px; color:#52525b;">
        Nếu bạn vẫn muốn đặt phòng, vui lòng thực hiện lại quy trình đặt phòng trên FScape.
      </p>
      <p style="margin:0; color:#71717a; font-size:13px;">
        Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ quản lý tòa nhà qua hệ thống FScape.
      </p>
    `),
  });
  await logEmailSent(email, subject, "CONTRACT_SIGNING_CANCELLED", contractId);
};

/**
 * Email to customer when contract cancelled because MANAGER did not sign in time.
 * Different tone: acknowledges it was not the customer's fault.
 */
exports.sendSigningCancelledByManagerEmail = async (
  email,
  { customerName, contractNumber, contractId, roomNumber, buildingName },
) => {
  if (await wasEmailSent("CONTRACT_CANCELLED_MANAGER_FAULT", contractId))
    return;
  const subject = `Hợp đồng ${contractNumber} — Đã bị hủy do quản lý chưa ký kịp thời`;
  await sendMailWithAudit({
    to: email,
    subject,
    templateKey: "CONTRACT_CANCELLED_MANAGER_FAULT",
    context: { contractNumber, roomNumber, buildingName },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#011936;">Xin chào ${customerName},</h2>
      <p style="margin:0 0 16px; color:#52525b;">
        Chúng tôi rất xin lỗi, hợp đồng thuê phòng của bạn đã bị <strong style="color:#dc2626;">hủy tự động</strong>
        do phía quản lý tòa nhà <strong>chưa ký kịp thời hạn</strong>. Đây không phải lỗi của bạn.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2; border:1px solid #fca5a5; border-radius:8px; margin:0 0 24px;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hợp đồng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${contractNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Phòng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${roomNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tòa nhà</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${buildingName}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 8px; color:#52525b;">
        Bạn có thể thực hiện lại quy trình đặt phòng trên FScape. Tiền cọc của bạn sẽ được xử lý theo quy định.
      </p>
      <p style="margin:0; color:#71717a; font-size:13px;">
        Chúng tôi đã thông báo đến ban quản trị để xử lý. Xin lỗi vì sự bất tiện này.
      </p>
    `),
  });
  await logEmailSent(
    email,
    subject,
    "CONTRACT_CANCELLED_MANAGER_FAULT",
    contractId,
  );
};

/**
 * Email to ADMIN(s) when a contract was cancelled because the manager did not sign in time.
 */
exports.sendManagerSigningExpiredAdminEmail = async (
  email,
  {
    managerName,
    contractNumber,
    contractId,
    customerName,
    roomNumber,
    buildingName,
  },
) => {
  const uniqueKey = `${contractId}_admin_${email}`;
  if (await wasEmailSent("MANAGER_SIGNING_EXPIRED_ADMIN", uniqueKey)) return;
  const subject = `[Cảnh báo] Hợp đồng ${contractNumber} bị hủy — Quản lý không ký kịp thời`;
  await sendMailWithAudit({
    to: email,
    subject,
    templateKey: "MANAGER_SIGNING_EXPIRED_ADMIN",
    context: { contractNumber, roomNumber, buildingName, managerName },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#011936;">Thông báo hệ thống</h2>
      <p style="margin:0 0 16px; color:#52525b;">
        Hợp đồng sau đã bị <strong style="color:#dc2626;">hủy tự động</strong> do quản lý tòa nhà
        <strong>không ký trong thời hạn 24 giờ</strong>.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff7ed; border:1px solid #fdba74; border-radius:8px; margin:0 0 24px;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hợp đồng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${contractNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Phòng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${roomNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tòa nhà</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${buildingName}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Khách hàng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Quản lý chịu trách nhiệm</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#dc2626;">${managerName}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 8px; color:#52525b;">
        Vui lòng kiểm tra và xử lý kịp thời. Khách hàng đã được thông báo về việc hủy hợp đồng.
      </p>
    `),
  });
  await logEmailSent(
    email,
    subject,
    "MANAGER_SIGNING_EXPIRED_ADMIN",
    uniqueKey,
  );
};

// ── Contract Termination Email ──

/**
 * Email to customer when Admin/BM manually terminates their contract.
 */
exports.sendContractTerminatedEmail = async (
  email,
  { customerName, contractNumber, contractId, roomNumber, buildingName, terminationReason },
) => {
  if (await wasEmailSent("CONTRACT_TERMINATED", contractId)) return;
  const subject = `Hợp đồng ${contractNumber} — Đã bị chấm dứt`;
  await sendMailWithAudit({
    to: email,
    subject,
    templateKey: "CONTRACT_TERMINATED",
    context: { contractNumber, roomNumber, buildingName },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#011936;">Xin chào ${customerName},</h2>
      <p style="margin:0 0 16px; color:#52525b;">
        Chúng tôi thông báo hợp đồng thuê phòng của bạn đã bị <strong style="color:#dc2626;">chấm dứt</strong> bởi ban quản lý.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2; border:1px solid #fca5a5; border-radius:8px; margin:0 0 24px;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hợp đồng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${contractNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Phòng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${roomNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tòa nhà</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${buildingName}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Lý do</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#dc2626;">${terminationReason}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 8px; color:#52525b;">
        Nhân viên quản lý sẽ liên hệ với bạn để hướng dẫn quy trình trả phòng và quyết toán (nếu có).
      </p>
      <p style="margin:0; color:#71717a; font-size:13px;">
        Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ ban quản lý tòa nhà qua hệ thống FScape.
      </p>
    `),
  });
  await logEmailSent(email, subject, "CONTRACT_TERMINATED", contractId);
};

// ── Payment Reminder & Cancellation Emails ──

exports.sendPaymentReminderEmail = async (
  email,
  {
    customerName,
    invoiceNumber,
    invoiceId,
    roomNumber,
    buildingName,
    totalAmount,
    dueDate,
  },
) => {
  if (await wasEmailSent("FIRST_RENT_PAYMENT_REMINDER", invoiceId)) return;
  const invoiceUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/my-invoices?invoiceId=${invoiceId}`;
  const subject = `Nhắc nhở: Hóa đơn ${invoiceNumber} — Thanh toán trước ${dueDate}`;
  await sendMailWithAudit({
    to: email,
    subject,
    templateKey: "FIRST_RENT_PAYMENT_REMINDER",
    context: { invoiceNumber, roomNumber, buildingName },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#011936;">Xin chào ${customerName},</h2>
      <p style="margin:0 0 16px; color:#52525b;">
        Hóa đơn tiền phòng kỳ đầu của bạn sắp đến hạn thanh toán. Vui lòng thanh toán trước hạn để tránh bị hủy hợp đồng.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef3c7; border:1px solid #fbbf24; border-radius:8px; margin:0 0 24px;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hóa đơn</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Phòng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${roomNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tòa nhà</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${buildingName}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tổng tiền</td>
                <td style="padding:4px 0; text-align:right; font-weight:700; color:#dc2626; font-size:16px;">${totalAmount}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Hạn thanh toán</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#dc2626;">${dueDate}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${invoiceUrl}" style="display:inline-block; background-color:#011936; color:#ffffff; text-decoration:none; padding:12px 32px; border-radius:6px; font-weight:600; font-size:15px;">
              Thanh toán ngay
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:24px 0 0; color:#71717a; font-size:13px;">
        Nếu không thanh toán trước hạn, hợp đồng có thể bị chấm dứt tự động.
      </p>
      <p style="margin:8px 0 0; color:#71717a; font-size:13px;">
        Nếu nút không hoạt động, hãy sao chép đường dẫn sau vào trình duyệt:<br/>
        <a href="${invoiceUrl}" style="color:#2563eb; word-break:break-all;">${invoiceUrl}</a>
      </p>
    `),
  });
  await logEmailSent(email, subject, "FIRST_RENT_PAYMENT_REMINDER", invoiceId);
};

exports.sendPaymentUrgentReminderEmail = async (
  email,
  {
    customerName,
    invoiceNumber,
    invoiceId,
    roomNumber,
    buildingName,
    totalAmount,
    dueDate,
  },
) => {
  if (await wasEmailSent("FIRST_RENT_PAYMENT_URGENT", invoiceId)) return;
  const invoiceUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/my-invoices?invoiceId=${invoiceId}`;
  const subject = `KHẨN: Hóa đơn ${invoiceNumber} — Hôm nay là hạn cuối`;
  await sendMailWithAudit({
    to: email,
    subject,
    templateKey: "FIRST_RENT_PAYMENT_URGENT",
    context: { invoiceNumber, roomNumber, buildingName },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#dc2626;">Xin chào ${customerName},</h2>
      <p style="margin:0 0 16px; color:#52525b;">
        <strong style="color:#dc2626;">Hôm nay là hạn cuối</strong> để thanh toán hóa đơn tiền phòng kỳ đầu. Nếu không thanh toán trong ngày, hợp đồng sẽ bị chấm dứt tự động.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2; border:1px solid #fca5a5; border-radius:8px; margin:0 0 24px;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hóa đơn</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Phòng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${roomNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tòa nhà</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${buildingName}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tổng tiền</td>
                <td style="padding:4px 0; text-align:right; font-weight:700; color:#dc2626; font-size:16px;">${totalAmount}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Hạn thanh toán</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#dc2626;">${dueDate}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${invoiceUrl}" style="display:inline-block; background-color:#dc2626; color:#ffffff; text-decoration:none; padding:12px 32px; border-radius:6px; font-weight:600; font-size:15px;">
              Thanh toán ngay
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:24px 0 0; color:#71717a; font-size:13px;">
        Nếu nút không hoạt động, hãy sao chép đường dẫn sau vào trình duyệt:<br/>
        <a href="${invoiceUrl}" style="color:#2563eb; word-break:break-all;">${invoiceUrl}</a>
      </p>
    `),
  });
  await logEmailSent(email, subject, "FIRST_RENT_PAYMENT_URGENT", invoiceId);
};

exports.sendFirstRentCancelledEmail = async (
  email,
  {
    customerName,
    invoiceNumber,
    invoiceId,
    contractNumber,
    roomNumber,
    buildingName,
    totalAmount,
  },
) => {
  if (await wasEmailSent("FIRST_RENT_CANCELLED", invoiceId)) return;
  const subject = `Hợp đồng ${contractNumber} — Đã bị hủy do chưa thanh toán kỳ đầu`;
  await sendMailWithAudit({
    to: email,
    subject,
    templateKey: "FIRST_RENT_CANCELLED",
    context: { contractNumber, invoiceNumber, roomNumber, buildingName },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#011936;">Xin chào ${customerName},</h2>
      <p style="margin:0 0 16px; color:#52525b;">
        Rất tiếc, hợp đồng thuê phòng của bạn đã bị <strong style="color:#dc2626;">chấm dứt tự động</strong> do chưa thanh toán hóa đơn tiền phòng kỳ đầu.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2; border:1px solid #fca5a5; border-radius:8px; margin:0 0 24px;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hợp đồng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${contractNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hóa đơn</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Phòng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${roomNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tòa nhà</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${buildingName}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số tiền chưa thanh toán</td>
                <td style="padding:4px 0; text-align:right; font-weight:700; color:#dc2626; font-size:16px;">${totalAmount}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 8px; color:#52525b;">
        Nếu bạn vẫn muốn đặt phòng, vui lòng thực hiện lại quy trình đặt phòng trên FScape.
      </p>
      <p style="margin:0; color:#71717a; font-size:13px;">
        Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ quản lý tòa nhà qua hệ thống FScape.
      </p>
    `),
  });
  await logEmailSent(email, subject, "FIRST_RENT_CANCELLED", invoiceId);
};

/**
 * Gửi email nhắc nhở nhận phòng cho customer (manual trigger by BM).
 */
exports.sendCheckInReminderEmail = async (
  email,
  {
    customerName,
    contractNumber,
    contractId,
    roomNumber,
    buildingName,
    startDate,
  },
) => {
  const subject = `Nhắc nhở nhận phòng — Hợp đồng ${contractNumber}`;
  await sendMailWithAudit({
    to: email,
    subject,
    templateKey: "MANUAL_CHECK_IN_REMINDER",
    context: { contractNumber, roomNumber, buildingName },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#011936;">Xin chào ${customerName},</h2>
      <p style="margin:0 0 16px; color:#52525b;">
        Hợp đồng thuê phòng của bạn đã được kích hoạt. Vui lòng thực hiện nhận phòng trên ứng dụng FScape để bắt đầu sử dụng phòng.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; margin:0 0 24px;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hợp đồng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${contractNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Phòng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${roomNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tòa nhà</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${buildingName}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Ngày bắt đầu</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#16a34a;">${startDate}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 8px; color:#52525b;">
        Vui lòng mở ứng dụng FScape và vào mục <strong>Phòng của tôi</strong> để thực hiện nhận phòng.
      </p>
      <p style="margin:0; color:#71717a; font-size:13px;">
        Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ quản lý tòa nhà qua hệ thống FScape.
      </p>
    `),
  });
  await logEmailSent(email, subject, "MANUAL_CHECK_IN_REMINDER", contractId);
};

/**
 * Gửi email nhắc nhở gia hạn hợp đồng cho customer (manual trigger by BM, no dedup).
 */
exports.sendManualExpiringReminderEmail = async (
  email,
  {
    customerName,
    contractNumber,
    contractId,
    roomNumber,
    buildingName,
    endDate,
  },
) => {
  const subject = `Nhắc nhở: Hợp đồng ${contractNumber} — Sắp hết hạn vào ${endDate}`;
  await sendMailWithAudit({
    to: email,
    subject,
    templateKey: "MANUAL_EXPIRING_REMINDER",
    context: { contractNumber, roomNumber, buildingName },
    html: wrapEmailTemplate(`
      <h2 style="margin:0 0 8px; color:#011936;">Xin chào ${customerName},</h2>
      <p style="margin:0 0 16px; color:#52525b;">
        Hợp đồng thuê phòng của bạn sẽ hết hạn vào ngày <strong style="color:#ea580c;">${endDate}</strong>.
        Nếu bạn muốn tiếp tục ở lại, vui lòng gia hạn hợp đồng trên ứng dụng FScape trước khi hết hạn.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff7ed; border:1px solid #fdba74; border-radius:8px; margin:0 0 24px;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Số hợp đồng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${contractNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Phòng</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${roomNumber}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Tòa nhà</td>
                <td style="padding:4px 0; text-align:right; font-weight:600; color:#011936;">${buildingName}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#64748b; font-size:13px;">Ngày hết hạn</td>
                <td style="padding:4px 0; text-align:right; font-weight:700; color:#ea580c; font-size:15px;">${endDate}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 8px; color:#52525b;">
        Vui lòng mở ứng dụng FScape và vào mục <strong>Hợp đồng của tôi</strong> để thực hiện gia hạn.
      </p>
      <p style="margin:0; color:#71717a; font-size:13px;">
        Nếu không gia hạn, hợp đồng sẽ tự động kết thúc khi hết hạn và phòng sẽ được trả lại.
      </p>
    `),
  });
  await logEmailSent(email, subject, "MANUAL_EXPIRING_REMINDER", contractId);
};
