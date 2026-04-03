require('./db/migrate');
require('./db/seed');

const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`Finance API server running on port ${config.port}`);
});
