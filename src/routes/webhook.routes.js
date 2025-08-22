<<<<<<< HEAD
const express = require('express');
const router = express.Router();
const depositController = require('../controllers/deposit.controller');

router.post('/webhook/:gateway', depositController.processWebhook);

=======
const express = require('express');
const router = express.Router();
const depositController = require('../controllers/deposit.controller');

router.post('/webhook/:gateway', depositController.processWebhook);

>>>>>>> 0afbe7bb440a2cd7fa92381b5002449f20f09162
module.exports = router;