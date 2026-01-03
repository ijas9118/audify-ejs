const app = require('./app');
const connectDB = require('./config/db');
require('./config/validateEnv'); // Validate env vars

const PORT = process.env.PORT || 3000;
connectDB();

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
