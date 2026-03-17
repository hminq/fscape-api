const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '1h'
    }
  );
};

module.exports = {
  generateAccessToken
};
