import nodemailer from 'nodemailer';
import { getEnvConfig } from '../config/database.js';

const envConfig = getEnvConfig();

// Create email transporter
const createTransporter = () => {
  // For development, use ethereal.email or a test service
  if (envConfig.NODE_ENV === 'development') {
    return nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email', // Replace with actual ethereal credentials
        pass: 'ethereal.password' // Replace with actual ethereal credentials
      }
    });
  }

  // For production, configure with your email service
  return nodemailer.createTransporter({
    host: envConfig.EMAIL_HOST || 'smtp.gmail.com',
    port: envConfig.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: envConfig.EMAIL_USER,
      pass: envConfig.EMAIL_PASS
    }
  });
};

// Send welcome email with temporary password
export const sendWelcomeEmail = async (userEmail, userName, temporaryPassword) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: envConfig.EMAIL_FROM || 'noreply@hostel.com',
      to: userEmail,
      subject: 'Welcome to Hostel Meal Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Hostel Meal Management System</h2>
          <p>Dear <strong>${userName}</strong>,</p>
          <p>Your account has been created successfully. Here are your login credentials:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Temporary Password:</strong> <code style="background-color: #fff; padding: 5px; border: 1px solid #ddd;">${temporaryPassword}</code></p>
          </div>
          
          <p><strong>Important:</strong> You will be required to change your password upon first login for security reasons.</p>
          
          <p>Please login at: <a href="${envConfig.FRONTEND_URL || 'http://localhost:3000'}">${envConfig.FRONTEND_URL || 'http://localhost:3000'}</a></p>
          
          <p>If you have any questions, please contact the hostel administration.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('Welcome email sent successfully');
    console.log('Message ID:', info.messageId);
    
    // For development, show the URL to preview the email
    if (envConfig.NODE_ENV === 'development' && nodemailer.getTestMessageUrl) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw new Error('Failed to send welcome email');
  }
};

// Send password change notification
export const sendPasswordChangeNotification = async (userEmail, userName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: envConfig.EMAIL_FROM || 'noreply@hostel.com',
      to: userEmail,
      subject: 'Password Changed Successfully',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Changed Successfully</h2>
          <p>Dear <strong>${userName}</strong>,</p>
          <p>Your password has been changed successfully.</p>
          
          <p>If you did not make this change, please contact the hostel administration immediately.</p>
          
          <p>Login at: <a href="${envConfig.FRONTEND_URL || 'http://localhost:3000'}">${envConfig.FRONTEND_URL || 'http://localhost:3000'}</a></p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Password change notification sent successfully');
    
    return true;
  } catch (error) {
    console.error('Error sending password change notification:', error);
    throw new Error('Failed to send password change notification');
  }
};

// Generate random password
export const generateRandomPassword = (length = 8) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one character from each category
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
  
  // Fill the rest
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};
