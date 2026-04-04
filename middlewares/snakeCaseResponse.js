function camelToSnakeCase(obj) {
    if (Array.isArray(obj)) {
        return obj.map(camelToSnakeCase);
    } else if (obj !== null && typeof obj === 'object') {
        // Prevent converting dates, regexes
        if (obj instanceof Date || obj instanceof RegExp) {
            return obj;
        }

        // Check if it's a Sequelize model instance 
        const data = typeof obj.toJSON === 'function' ? obj.toJSON() : obj;

        return Object.keys(data).reduce((acc, key) => {
            // Convert specific Sequelize timestamps to snake_case
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            acc[snakeKey] = camelToSnakeCase(data[key]);
            return acc;
        }, {});
    }
    return obj;
}

const snakeCaseResponse = (req, res, next) => {
    const originalJson = res.json;

    res.json = function (body) {
        if (body) {
            body = camelToSnakeCase(body);
        }
        return originalJson.call(this, body);
    };

    next();
};

module.exports = snakeCaseResponse;
