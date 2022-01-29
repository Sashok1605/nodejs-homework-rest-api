const express = require('express');
const router = express.Router();
const createError = require('http-errors');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs').promises;
const passport = require('passport');
const multer = require('../../multer/multer');
const { v4: uuidv4 } = require('uuid');
const gravatar = require('gravatar');
const Jimp = require('jimp');
require('dotenv').config();
const secret = process.env.SECRET;

const {
  listUsers,
  addUser,
  removeUser,
  getUserByEmail,
  updateTokenById,
} = require('../../model/Users');

const auth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (!user || err || req.headers.authorization !== 'Bearer ' + user.token) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'Unauthorized',
        data: 'Unauthorized',
      });
    }
    req.user = user;
    next();
  })(req, res, next);
};

router.get('/', async (req, res, next) => {
  try {
    res.json(await listUsers());
    return res.status(200);
  } catch (err) {
    next(createError(err));
  }
});

router.post('/', async (req, res, next) => {
  try {
    const result = await addUser(req.body);
    if (!result) throw new Error('missing field required');
    return res.status(201).json(result);
  } catch (err) {
    next(createError(404, err));
  }
});

router.delete('/:userId', async (req, res, next) => {
  try {
    const result = await removeUser(req.params.userId);
    if (!result) throw new Error('Not found');
    res.status(200).json({ message: 'contact deleted' });
  } catch (err) {
    next(createError(404, err));
  }
});

router.post('/signup', async (req, res, next) => {
  try {
    const user = await getUserByEmail(req.body.email);
    if (user)
      return res.status(409).json({
        status: 'error',
        code: 409,
        message: 'Email is already in use',
        data: 'Conflict',
      });
    await addUser(req.body, gravatar.url(req.body.email));

    res.status(201).json({
      status: 'success',
      code: 201,
      data: {
        message: 'Registration successful',
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const user = await getUserByEmail(req.body.email);
    if (!user || !user.validPassword(req.body.password)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Incorrect login or password',
        data: 'Bad request',
      });
    }
    const payload = {
      id: user.id,
      password: user.password,
      email: user.email,
    };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    await updateTokenById(user.id, token);
    res.status(200).json({
      status: 'success',
      code: 200,
      data: {
        token,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/logout', auth, async (req, res, next) => {
  await updateTokenById(req.user.id, null);
  res.json({
    status: 'success',
    code: 200,
    data: {
      email: req.user.email,
      subscription: req.user.subscription,
    },
  });
});

router.get('/current', auth, async (req, res, next) => {
  try {
    return res.json({
      status: 'success',
      code: 200,
      data: {
        email: req.user.email,
        subscription: req.user.subscription,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/avatars',
  auth,
  multer.single('avatar'),
  async (req, res, next) => {
    const { description } = req.body;
    const { path: temporaryName, originalname } = req.file;

    const newPathFile = path.join(
      process.cwd(),
      `public/avatars/${uuidv4()}_${originalname}`,
    );

    Jimp.read(temporaryName, async (err, lenna) => {
      if (err) throw err;
      lenna
        .resize(250, 250) // resize
        .quality(60) // set JPEG quality
        .greyscale() // set greyscale
        .write(newPathFile); // save
      await fs.unlink(temporaryName);
    });

    res.json({ description, message: 'Файл успешно загружен', status: 200 });
  },
);

module.exports = router;
