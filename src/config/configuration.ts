export const configuration = () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
  },
  app: {
    frontendUrl: process.env.APP_FRONTEND_URL || 'http://localhost:3001',
  },
  shiprocket: {
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
    channelId: process.env.SHIPROCKET_CHANNEL_ID,
    pickupPostcode: process.env.SHIPROCKET_PICKUP_POSTCODE || '110001',
  },
  phonepe: {
    clientId: process.env.PHONEPE_CLIENT_ID,
    clientSecret: process.env.PHONEPE_CLIENT_SECRET,
    clientVersion: process.env.PHONEPE_CLIENT_VERSION,
    environment: process.env.PHONEPE_ENVIRONMENT || 'sandbox',
  },
});
