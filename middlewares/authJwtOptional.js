const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

module.exports = async function authJwtOptional(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = { role: 'PUBLIC' };
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findByPk(payload.sub);
        if (!user) {
            req.user = { role: 'PUBLIC' };
            return next();
        }

        if (!user.is_active) {
            return res.status(403).json({
                message: 'Account is inactive',
            });
        }

        req.user = {
            id: user.id,
            role: user.role,
            building_id: user.building_id,
        };

        next();
    } catch (err) {
        // Treat invalid tokens as unauthenticatedg 
        req.user = { role: 'PUBLIC' };
        next();
    }
};
