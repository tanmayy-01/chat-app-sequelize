const express = require('express');
const { AuthController } = require('../../controllers');
const { validateRegisterRequest, validateAuthRequest } = require('../../middlewares');

const router = express.Router();

router.post('/register', validateRegisterRequest, AuthController.register);
router.post('/login', validateAuthRequest, AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/logout', AuthController.logout);

module.exports = router;

