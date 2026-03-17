const { Sequelize } = require("sequelize")
// for testing
// const sequelize = process.env.NODE_ENV === "test"
//   ? new Sequelize("sqlite::memory:", { logging: false })
//   : process.env.DATABASE_URL
//     ? new Sequelize(process.env.DATABASE_URL, {
//         dialect: "postgres",
//         logging: false,
//         dialectOptions: {
//           ssl: {
//             require: true,
//             rejectUnauthorized: false
//           }
//         }
//       })
//     : new Sequelize(
//         process.env.DB_NAME,
//         process.env.DB_USER,
//         process.env.DB_PASSWORD,
//         {
//           host: process.env.DB_HOST || "localhost",
//           port: process.env.DB_PORT || 5432,
//           dialect: "postgres",
//           logging: false
//         }
//       )

// CODE Chạy (Khi chưa có môi trường test):
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || 5432,
        dialect: "postgres",
        logging: false
      }
    )
const connectDB = async () => {
  try {
    await sequelize.authenticate()
    console.log("PostgreSQL connected")
  } catch (error) {
    console.error("Database connection failed")
    console.error(error)
    process.exit(1)
  }
}

module.exports = {
  sequelize,
  connectDB
}