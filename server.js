// ══════════════════════════════════════════
// server.js — Portfolio Backend
// Node.js + Express + MongoDB Atlas
// ══════════════════════════════════════════

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

// IMPORTANT: .env is one folder above frontend/server.js
require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
});

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

// Check environment variables
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is missing.');
  console.error('Make sure portfolio_output/.env contains MONGO_URI.');
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET is missing.');
  console.error('Make sure portfolio_output/.env contains JWT_SECRET.');
  process.exit(1);
}

// ══════════════════════════════════════════
// MIDDLEWARE
// ══════════════════════════════════════════

app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve frontend files
// FIX: browsers/proxies were caching index.html + the /api/portfolio
// responses, so a closed-and-reopened tab could show old data even
// though the database had already been updated. no-cache headers
// force a fresh fetch every time the page or the API is requested.
app.use(express.static(__dirname, {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));

// Homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ══════════════════════════════════════════
// DATABASE CONNECTION — MONGODB ATLAS
// ══════════════════════════════════════════

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Atlas Connected Successfully');
  })
  .catch((err) => {
    console.error('❌ MongoDB Atlas Error:', err.message);
    process.exit(1);
  });

// ══════════════════════════════════════════
// SCHEMAS & MODELS
// ══════════════════════════════════════════

// Admin User
const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
});

const Admin = mongoose.model('Admin', adminSchema);

// Contact Messages
const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  }
});

const Contact = mongoose.model('Contact', contactSchema);

// Portfolio Dynamic Data
const portfolioSchema = new mongoose.Schema({
  section: {
    type: String,
    required: true,
    unique: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Portfolio = mongoose.model('Portfolio', portfolioSchema);

// ══════════════════════════════════════════
// AUTH MIDDLEWARE
// ══════════════════════════════════════════

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired token'
    });
  }
}

// ══════════════════════════════════════════
// DEFAULT PORTFOLIO DATA
// ══════════════════════════════════════════

const DEFAULT_DATA = {

  hero: {
    badge: 'Available for work',
    line1: 'Building',
    line2: 'Digital',
    line3: 'Solutions',
    desc: 'Software Engineer specializing in full-stack web development and AI-based systems.',
    s1: '10+',
    s2: '2+',
    s3: '5+'
  },

  about: {
    name: 'Muhammad Hussnain Tanveer',
    badge: 'Engineer',
    p1: "I'm a passionate Software Engineer with strong expertise in web development and AI-based applications.",
    p2: 'I have experience in both frontend and backend technologies, enabling me to develop complete full-stack applications.',
    p3: 'Currently, I am working on innovative projects like SignTalk — an AI-based sign language recognition system.',
    tags: 'Problem Solver, AI Enthusiast, Clean Code, Full Stack, Team Player, Continuous Learner'
  },

  skills: [
    {
      id: 1,
      icon: '🎨',
      name: 'Frontend',
      list: 'HTML · CSS · JavaScript\nReact · Bootstrap\nResponsive Design'
    },
    {
      id: 2,
      icon: '⚙️',
      name: 'Backend',
      list: 'Node.js · Express\nREST APIs · Authentication'
    },
    {
      id: 3,
      icon: '🗄️',
      name: 'Database',
      list: 'MySQL · Firebase · MongoDB'
    },
    {
      id: 4,
      icon: '🛠️',
      name: 'Tools',
      list: 'Git · VS Code · Postman'
    },
    {
      id: 5,
      icon: '📱',
      name: 'Mobile',
      list: 'Android Development\nAPI Integration'
    },
    {
      id: 6,
      icon: '🤖',
      name: 'AI / ML',
      list: 'TensorFlow · OpenCV\nSpeech & Vision Models'
    }
  ],

  hobbies: {
    intro: "Beyond the code editor, here's what keeps me energized.",
    items: [
      {
        id: 1,
        icon: '📖',
        name: 'Reading & Books',
        desc: 'I love tech books, self-improvement, and sci-fi novels.',
        tags: 'Tech Books, Self-Help, Sci-Fi'
      },
      {
        id: 2,
        icon: '🎮',
        name: 'Gaming',
        desc: 'Strategy games and action RPGs challenge my thinking.',
        tags: 'Strategy, Action RPG, Open World'
      },
      {
        id: 3,
        icon: '🎵',
        name: 'Music',
        desc: 'Lo-fi and instrumentals keep me focused while coding.',
        tags: 'Lo-fi, Instrumental, Classical'
      },
      {
        id: 4,
        icon: '✈️',
        name: 'Travelling',
        desc: 'Exploring new cultures fuels my creativity.',
        tags: 'Exploration, Culture, Adventure'
      }
    ]
  },

  projects: [
    {
      id: 1,
      icon: '🤟',
      name: 'SignTalk (AI Project)',
      year: '2026',
      desc: 'AI sign language recognition converting gestures to text.',
      demo: '#',
      github: '#',
      stack: 'TensorFlow, OpenCV, Python',
      bg: 'linear-gradient(135deg,#0e1f35,#0a2540)'
    },
    {
      id: 2,
      icon: '🍽️',
      name: 'Restaurant Management System',
      year: '2024',
      desc: 'Full-stack system for managing orders, users, and menus.',
      demo: '#',
      github: '#',
      stack: 'Node.js, Express, MySQL',
      bg: 'linear-gradient(135deg,#1a0e2e,#2d1452)'
    },
    {
      id: 3,
      icon: '📊',
      name: 'Admin Dashboard',
      year: '2024',
      desc: 'Interactive dashboard with analytics and user management.',
      demo: '#',
      github: '#',
      stack: 'React, Chart.js',
      bg: 'linear-gradient(135deg,#0d1f1a,#0a2e20)'
    }
  ],

  contact: {
    heading: "Let's build something great together.",
    sub: 'Feel free to contact me for projects, collaboration, or opportunities.',
    email: 'hussnain@email.com',
    linkedin: 'linkedin.com/in/hussnain',
    github: 'github.com/hussnain',
    footer: 'Muhammad Hussnain Tanveer'
  }
};

// ══════════════════════════════════════════
// SEED ADMIN & DEFAULT DATA
// ══════════════════════════════════════════

async function seedDatabase() {
  try {

    const existing = await Admin.findOne({
      username: 'admin'
    });

    if (!existing) {

      const hashed = await bcrypt.hash(
        'hussnain2026',
        10
      );

      await Admin.create({
        username: 'admin',
        password: hashed
      });

      console.log(
        '✅ Default admin initialized → admin / hussnain2026'
      );
    }

    for (const [section, data] of Object.entries(DEFAULT_DATA)) {

      const exists = await Portfolio.findOne({
        section
      });

      if (!exists) {

        await Portfolio.create({
          section,
          data
        });

        console.log(`✅ Seeded section: ${section}`);
      }
    }

  } catch (err) {

    console.error(
      '❌ Seed error:',
      err.message
    );
  }
}

// ══════════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════════

// Health Check
app.get('/api/health', (req, res) => {

  res.json({
    message: '🚀 Hussnain Portfolio API is running perfectly',
    status: 'ok'
  });

});

// ══════════════════════════════════════════
// AUTH LOGIN
// ══════════════════════════════════════════

app.post('/api/auth/login', async (req, res) => {

  try {

    const {
      username,
      password
    } = req.body;

    if (!username || !password) {

      return res.status(400).json({
        error: 'Username and password required'
      });

    }

    const admin = await Admin.findOne({
      username
    });

    if (!admin) {

      return res.status(401).json({
        error: 'Invalid credentials'
      });

    }

    const match = await bcrypt.compare(
      password,
      admin.password
    );

    if (!match) {

      return res.status(401).json({
        error: 'Invalid credentials'
      });

    }

    const token = jwt.sign(
      {
        id: admin._id,
        username
      },
      JWT_SECRET,
      {
        expiresIn: '7d'
      }
    );

    res.json({
      success: true,
      token,
      username
    });

  } catch (err) {

    console.error('Login error:', err);

    res.status(500).json({
      error: 'Server error'
    });

  }

});

// ══════════════════════════════════════════
// CHANGE PASSWORD
// ══════════════════════════════════════════

app.post(
  '/api/auth/change-password',
  authMiddleware,
  async (req, res) => {

    try {

      const {
        oldPassword,
        newPassword
      } = req.body;

      const admin = await Admin.findById(
        req.admin.id
      );

      if (!admin) {

        return res.status(404).json({
          error: 'Admin not found'
        });

      }

      const match = await bcrypt.compare(
        oldPassword,
        admin.password
      );

      if (!match) {

        return res.status(400).json({
          error: 'Current password is wrong'
        });

      }

      if (
        !newPassword ||
        newPassword.length < 4
      ) {

        return res.status(400).json({
          error: 'New password too short'
        });

      }

      admin.password = await bcrypt.hash(
        newPassword,
        10
      );

      await admin.save();

      res.json({
        success: true,
        message: 'Password updated successfully'
      });

    } catch (err) {

      console.error(
        'Change password error:',
        err
      );

      res.status(500).json({
        error: 'Server error'
      });

    }

  }
);

// ══════════════════════════════════════════
// GET ONE PORTFOLIO SECTION
// ══════════════════════════════════════════

app.get(
  '/api/portfolio/:section',
  async (req, res) => {

    try {

      const doc = await Portfolio.findOne({
        section: req.params.section
      });

      if (!doc) {

        return res.status(404).json({
          error: 'Section not found'
        });

      }

      res.json({
        section: doc.section,
        data: doc.data
      });

    } catch (err) {

      console.error(
        'Portfolio section error:',
        err
      );

      res.status(500).json({
        error: 'Server error'
      });

    }

  }
);

// ══════════════════════════════════════════
// GET ALL PORTFOLIO DATA
// ══════════════════════════════════════════

app.get(
  '/api/portfolio',
  async (req, res) => {

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    try {

      const docs = await Portfolio.find();

      const result = {};

      docs.forEach(doc => {
        result[doc.section] = doc.data;
      });

      res.json(result);

    } catch (err) {

      console.error(
        'Portfolio error:',
        err
      );

      res.status(500).json({
        error: 'Server error'
      });

    }

  }
);

// ══════════════════════════════════════════
// UPDATE PORTFOLIO
// ══════════════════════════════════════════

app.put(
  '/api/portfolio/:section',
  authMiddleware,
  async (req, res) => {

    try {

      const {
        section
      } = req.params;

      const {
        data
      } = req.body;

      if (!data) {

        return res.status(400).json({
          error: 'Data is required'
        });

      }

      const doc =
        await Portfolio.findOneAndUpdate(

          { section },

          {
            data,
            updatedAt: new Date()
          },

          {
            new: true,
            upsert: true
          }

        );

      res.json({
        success: true,
        section: doc.section,
        data: doc.data
      });

    } catch (err) {

      console.error(
        'Portfolio update error:',
        err
      );

      res.status(500).json({
        error: 'Server error'
      });

    }

  }
);

// ══════════════════════════════════════════
// CONTACT FORM
// ══════════════════════════════════════════

app.post(
  '/api/contact',
  async (req, res) => {

    try {

      const {
        name,
        email,
        message
      } = req.body;

      if (
        !name ||
        !email ||
        !message
      ) {

        return res.status(400).json({
          error: 'All fields are required'
        });

      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {

        return res.status(400).json({
          error: 'Invalid email address'
        });

      }

      const msg =
        await Contact.create({
          name,
          email,
          message
        });

      res.json({
        success: true,
        message: 'Message sent successfully!',
        id: msg._id
      });

    } catch (err) {

      console.error(
        'Contact error:',
        err
      );

      res.status(500).json({
        error: 'Server error'
      });

    }

  }
);

// ══════════════════════════════════════════
// GET CONTACT MESSAGES
// ══════════════════════════════════════════

app.get(
  '/api/contact',
  authMiddleware,
  async (req, res) => {

    try {

      const messages =
        await Contact
          .find()
          .sort({
            createdAt: -1
          });

      res.json({
        success: true,
        count: messages.length,
        messages
      });

    } catch (err) {

      console.error(
        'Get messages error:',
        err
      );

      res.status(500).json({
        error: 'Server error'
      });

    }

  }
);

// ══════════════════════════════════════════
// MARK MESSAGE AS READ
// ══════════════════════════════════════════

app.patch(
  '/api/contact/:id/read',
  authMiddleware,
  async (req, res) => {

    try {

      await Contact.findByIdAndUpdate(
        req.params.id,
        {
          read: true
        }
      );

      res.json({
        success: true
      });

    } catch (err) {

      console.error(
        'Mark read error:',
        err
      );

      res.status(500).json({
        error: 'Server error'
      });

    }

  }
);

// ══════════════════════════════════════════
// DELETE MESSAGE
// ══════════════════════════════════════════

app.delete(
  '/api/contact/:id',
  authMiddleware,
  async (req, res) => {

    try {

      await Contact.findByIdAndDelete(
        req.params.id
      );

      res.json({
        success: true,
        message: 'Message deleted'
      });

    } catch (err) {

      console.error(
        'Delete message error:',
        err
      );

      res.status(500).json({
        error: 'Server error'
      });

    }

  }
);

// ══════════════════════════════════════════
// START SERVER AFTER DATABASE CONNECTS
// ══════════════════════════════════════════

mongoose.connection.once(
  'open',
  async () => {

    await seedDatabase();

    app.listen(
      PORT,
      () => {

        console.log(
          `🚀 Server running at http://localhost:${PORT}`
        );

      }
    );

  }
);