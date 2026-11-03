const express = require('express');
const { ViewController, AuthController } = require('../controllers');
const { checkAuth, redirectIfAuthenticated } = require('../middlewares');

const router = express.Router();

router.get('/login', redirectIfAuthenticated, ViewController.renderLogin);
router.get('/register', redirectIfAuthenticated, ViewController.renderRegister);
router.get('/', checkAuth, ViewController.renderChat);
router.get('/profile', checkAuth, ViewController.renderProfile);
router.get('/logout', AuthController.logout);

module.exports = router;

