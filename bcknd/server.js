const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = 3000;

// Supabase client initialization
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware for parsing JSON requests
app.use(express.json());

// Utility function to validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Utility function to validate password strength
const isValidPassword = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
 return passwordRegex.test(password);
};

// User registration endpoint
app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user into Supabase
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email: email,
          password_hash: hashedPassword,
          role: 'user' // Default role
        }
      ])
      .select();

    if (error) {
      // Check if it's a duplicate email error
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Return success response (without password hash)
    const user = data[0];
    const { password_hash, ...userWithoutPassword } = user;
    res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error in registration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login endpoint
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Query Supabase for user with matching email
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, password_hash, role')
      .eq('email', email);

    if (error) {
      console.error('Error querying user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Check if user exists
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Compare provided password with stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    // Return token and user info (without password hash)
    const { password_hash, ...userWithoutPassword } = user;
    res.json({
      message: 'Login successful',
      token: token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // Attach user information to request object
    req.user = decoded;
    next();
  });
};

// isAdmin middleware
const isAdmin = (req, res, next) => {
  // This middleware should be used after authenticateToken
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

// Protected route example - requires authentication
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Get user details from Supabase
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .eq('id', req.user.userId);

    if (error) {
      console.error('Error fetching user profile:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile retrieved successfully',
      user: users[0]
    });
  } catch (error) {
    console.error('Error in profile route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin-only route example - requires admin role
app.delete('/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Delete user from Supabase
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete user route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public route - no authentication required
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the API! Public route accessible to everyone.',
    endpoints: {
      register: 'POST /register',
      login: 'POST /login',
      profile: 'GET /profile (requires authentication)',
      deleteUser: 'DELETE /admin/users/:id (requires admin role)'
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;
