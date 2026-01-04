const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./config/logger');
require('./config/validateEnv');

const PORT = process.env.PORT || 3000;
connectDB();

app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});
