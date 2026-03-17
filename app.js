require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()

const snakeCaseResponse = require('./middlewares/snakeCaseResponse');

app.use(cors())
app.use(express.json())
app.use(snakeCaseResponse)

// ─── Health check ──────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }))

// ─── Routes ────────────────────────────────────────────────
app.use('/api/rooms', require('./routes/room.routes'))
app.use('/api/room-types', require('./routes/roomType.routes'))
app.use('/api/assets', require('./routes/asset.routes'))
app.use('/api/locations', require('./routes/location.routes'));     //
app.use('/api/universities', require('./routes/university.routes')); //
app.use('/api/buildings', require('./routes/building.routes'));      //
app.use('/api/buildings/rooms', require('./routes/room.routes'));      //
app.use('/api/facilities', require('./routes/facility.routes'));     //
app.use('/api/requests', require('./routes/request.routes'));
app.use('/api/auth/internal', require('./routes/internalAuth.route'));
app.use('/api/users', require('./routes/adminUser.route'));
app.use('/api/auth', require('./routes/auth.route'));
app.use('/api/user-profile', require('./routes/userProfile.route'));
app.use('/api/bookings', require('./routes/booking.routes'));
app.use('/api/payment', require('./routes/payment.routes'));
app.use('/api/upload', require('./routes/upload.routes'));
app.use('/api/asset-types', require('./routes/assetType.routes'));
app.use('/api/contract-templates', require('./routes/contractTemplate.routes'));
app.use('/api/inspections', require('./routes/inspection.routes'));
app.use('/api/contracts', require('./routes/contract.routes'));
app.use('/api/audit-logs', require('./routes/auditLog.routes'));
app.use('/api/invoices', require('./routes/invoice.routes'));
app.use('/api/settlements', require('./routes/settlement.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
module.exports = app