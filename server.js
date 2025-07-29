const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const path = require('path');

const User = require('./models/User');
const Shayari = require('./models/Shayari');

require('dotenv').config();
require('./db')();
require('./passport-config')(passport);

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Static files (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to check authentication
function isAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/signin');
}

// Homepage (all Shayaris)
app.get('/', async (req, res) => {
  try {
    const shayaris = await Shayari.find().populate('author').sort('-createdAt');
    res.render('index', { 
      user: req.user, 
      shayaris,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error(err);
    res.render('index', { user: req.user, shayaris: [], success: [], error: ['Error loading Shayaris'] });
  }
});

// signup GET route
app.get('/signup', (req, res) => {
  res.render('signup', {
    message: req.flash('error'),
    success: req.flash('success')
  });
});

// Signup POST

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    req.flash('error', 'Please enter both username and password.');
    return res.redirect('/signup');
  }

  try {
    const existingUser = await User.findOne({ username: username.trim() });
    if (existingUser) {
      req.flash('error', 'Username already exists.');
      return res.redirect('/signup');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ username: username.trim(), password: hashedPassword });

    req.flash('success', 'Account created successfully. Please sign in.');
    res.redirect('/signin');

  } catch (err) {
    console.error('Signup error:', err);
    req.flash('error', 'Unexpected error occurred, please try again');
    res.redirect('/signup');
  }
});

// Signin page
app.get('/signin', (req, res) => {
  res.render('signin', {
    message: req.flash('error'),
    success: req.flash('success')
  });
});

// Signin POST
app.post('/signin',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/signin',
    failureFlash: true
  })
);

// Logout
app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// Post a new Shayari form (authenticated)
app.get('/post', isAuth, (req, res) => {
  res.render('post', { user: req.user, success: req.flash('success'), error: req.flash('error') });
});

// Submit new Shayari
app.post('/post', isAuth, async (req, res) => {
  const { content } = req.body;
  if (!content) {
    req.flash('error', 'Shayari content cannot be empty.');
    return res.redirect('/post');
  }
  try {
    await Shayari.create({ content, author: req.user._id });
    req.flash('success', 'Shayari posted successfully!');
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to post Shayari.');
    res.redirect('/post');
  }
});

// User Dashboard — only user's Shayaris
app.get('/dashboard', isAuth, async (req, res) => {
  try {
    const shayaris = await Shayari.find({ author: req.user._id }).sort('-createdAt');
    res.render('dashboard', {
      user: req.user,         // <-- user object पास हो रहा है
      shayaris,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load your Shayaris.');
    res.redirect('/');
  }
});


// Edit Shayari Form (GET)
app.get('/edit/:id', isAuth, async (req, res) => {
  try {
    const shayari = await Shayari.findOne({ _id: req.params.id, author: req.user._id });
    if (!shayari) {
      req.flash('error', 'Shayari not found!');
      return res.redirect('/dashboard');
    }
    res.render('edit', { user: req.user, shayari, success: req.flash('success'), error: req.flash('error') });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error loading Shayari.');
    res.redirect('/dashboard');
  }
});

// Edit Shayari (POST)
app.post('/edit/:id', isAuth, async (req, res) => {
  try {
    const shayari = await Shayari.findOne({ _id: req.params.id, author: req.user._id });
    if (!shayari) {
      req.flash('error', 'Unauthorized to edit this Shayari.');
      return res.redirect('/dashboard');
    }
    if (!req.body.content) {
      req.flash('error', 'Content cannot be empty.');
      return res.redirect(`/edit/${req.params.id}`);
    }
    shayari.content = req.body.content;
    await shayari.save();
    req.flash('success', 'Shayari updated successfully!');
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update Shayari.');
    res.redirect('/dashboard');
  }
});

// Delete Shayari (POST)
app.post('/delete/:id', isAuth, async (req, res) => {
  try {
    await Shayari.deleteOne({ _id: req.params.id, author: req.user._id });
    req.flash('success', 'Shayari deleted successfully!');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete Shayari.');
  }
  res.redirect('/dashboard');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
