const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Verify Google ID Token
const verifyGoogleToken = async (idToken) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    return {
      success: true,
      data: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        emailVerified: payload.email_verified
      }
    };
  } catch (error) {
    console.error('Google token verification error:', error);
    return {
      success: false,
      message: 'Invalid Google token'
    };
  }
};

// Create or update user from Google OAuth
const createOrUpdateUserFromGoogle = async (googleData) => {
  try {
    const { googleId, email, name, picture } = googleData;

    // Check if user exists by Google ID
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if user exists by email
      user = await User.findOne({ email });

      if (user) {
        // Update existing user with Google ID
        user.googleId = googleId;
        user.avatar = picture;
        await user.save();
      } else {
        // Create new user
        user = new User({
          googleId,
          email,
          name,
          avatar: picture,
          role: 'student', // Default role
          approved: false // Default approval status
        });
        await user.save();
      }
    } else {
      // Update existing Google user
      user.name = name;
      user.avatar = picture;
      await user.save();
    }

    return {
      success: true,
      data: user
    };
  } catch (error) {
    console.error('Error creating/updating user from Google:', error);
    return {
      success: false,
      message: 'Error processing user data'
    };
  }
};

// Generate JWT token
const generateJWTToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Google OAuth login handler
const handleGoogleLogin = async (idToken) => {
  try {
    // Verify Google token
    const verificationResult = await verifyGoogleToken(idToken);
    
    if (!verificationResult.success) {
      return verificationResult;
    }

    // Create or update user
    const userResult = await createOrUpdateUserFromGoogle(verificationResult.data);
    
    if (!userResult.success) {
      return userResult;
    }

    const user = userResult.data;

    // Generate JWT token
    const token = generateJWTToken(user._id);

    return {
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          approved: user.approved,
          department: user.department
        },
        token
      }
    };
  } catch (error) {
    console.error('Google login error:', error);
    return {
      success: false,
      message: 'Authentication failed'
    };
  }
};

module.exports = {
  verifyGoogleToken,
  createOrUpdateUserFromGoogle,
  generateJWTToken,
  handleGoogleLogin
}; 