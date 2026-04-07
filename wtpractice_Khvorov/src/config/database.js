const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'web_forum',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    logging: false,
    define: {
      underscored: true,
      timestamps: false
    }
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    define: {
      underscored: true,
      timestamps: false
    }
  }
};

module.exports = config[env];
