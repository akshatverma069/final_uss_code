import { Request, Response } from 'express';
import pool from '../config/database';
import { hashPasswordSHA256, verifyPasswordSHA256, calculatePasswordStrength } from '../utils/crypto';
import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Login
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [users] = await pool.execute(
      'SELECT user_id, username, pswd FROM users WHERE username = ?',
      [username]
    ) as any[];

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = users[0];
    const isValidPassword = verifyPasswordSHA256(password, user.pswd);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, username: user.username },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        userId: user.user_id,
        username: user.username,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Signup
export const signup = async (req: Request, res: Response) => {
  try {
    const { username, password, confirmPassword, questionId, answer } = req.body;

    if (!username || !password || !confirmPassword || !questionId || !answer) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Check if username already exists
    const [existingUsers] = await pool.execute(
      'SELECT user_id FROM users WHERE username = ?',
      [username]
    ) as any[];

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = hashPasswordSHA256(password);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (username, pswd, question_id, answers) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, questionId, JSON.stringify([answer])]
    ) as any;

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertId, username },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        userId: result.insertId,
        username,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get security question
export const getSecurityQuestion = async (req: Request, res: Response) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const [users] = await pool.execute(
      'SELECT question_id FROM users WHERE username = ?',
      [username]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [questions] = await pool.execute(
      'SELECT question_id, question_text FROM questions WHERE question_id = ?',
      [users[0].question_id]
    ) as any[];

    if (questions.length === 0) {
      return res.status(404).json({ error: 'Security question not found' });
    }

    res.json({
      questionId: questions[0].question_id,
      question: questions[0].question_text,
    });
  } catch (error: any) {
    console.error('Get security question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify security answer (for forgot password)
export const verifySecurityAnswer = async (req: Request, res: Response) => {
  try {
    const { username, questionId, answer } = req.body;

    if (!username || !questionId || !answer) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const [users] = await pool.execute(
      'SELECT user_id, answers FROM users WHERE username = ? AND question_id = ?',
      [username, questionId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found or question mismatch' });
    }

    const answers = JSON.parse(users[0].answers || '[]');
    const isValid = answers.includes(answer);

    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect answer' });
    }

    res.json({ success: true, userId: users[0].user_id });
  } catch (error: any) {
    console.error('Verify security answer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { userId, currentPassword, newPassword, questionId, answer } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'User ID and new password are required' });
    }

    // Verify current password or security answer
    if (currentPassword) {
      const [users] = await pool.execute(
        'SELECT pswd FROM users WHERE user_id = ?',
        [userId]
      ) as any[];

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValidPassword = verifyPasswordSHA256(currentPassword, users[0].pswd);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    } else if (questionId && answer) {
      const [users] = await pool.execute(
        'SELECT answers FROM users WHERE user_id = ? AND question_id = ?',
        [userId, questionId]
      ) as any[];

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found or question mismatch' });
      }

      const answers = JSON.parse(users[0].answers || '[]');
      if (!answers.includes(answer)) {
        return res.status(401).json({ error: 'Security answer is incorrect' });
      }
    } else {
      return res.status(400).json({ error: 'Either current password or security answer is required' });
    }

    // Hash new password
    const hashedPassword = hashPasswordSHA256(newPassword);

    // Update password
    await pool.execute(
      'UPDATE users SET pswd = ? WHERE user_id = ?',
      [hashedPassword, userId]
    );

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all security questions
export const getAllSecurityQuestions = async (req: Request, res: Response) => {
  try {
    const [questions] = await pool.execute(
      'SELECT question_id, question_text FROM questions ORDER BY question_id'
    ) as any[];

    res.json(questions);
  } catch (error: any) {
    console.error('Get security questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

