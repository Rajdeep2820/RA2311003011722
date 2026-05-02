require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const evaluationService = require('./services/EvaluationService');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/', routes);

app.use(async (err, req, res, next) => {
  console.error('[Exception]', err.stack);
  if (evaluationService.logger) {
    await evaluationService.logger.log('backend', 'fatal', 'middleware', err.message);
  }
  res.status(500).send('Internal Server Error');
});

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    await evaluationService.authenticate();
    console.log('Auth flow complete.');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Boot failure:', error.message);
    process.exit(1);
  }
}

bootstrap();
