// const jwt = require('jsonwebtoken');

// const secret = process.env.SECRET;

// const auth = (req, res, next) => {
//     const authHeader = req.headers.authorization;
  
//     if (!authHeader) {
//       return res.status(401).json({ message: 'No Authorization header provided' });
//     }
  
//     const token = authHeader.startsWith('Bearer ')
//       ? authHeader.split(' ')[1] 
//       : authHeader;
  
//     if (!token) {
//       return res.status(401).json({ message: 'No token provided' });
//     }

  
//     try {
//       const decoded = jwt.verify(token, secret);
  
//       req.user = decoded;
  
//       next(); 
//     } catch (err) {
//       console.error('Token verification error:', err.message); 
//       res.status(401).json({ message: 'Invalid or expired token' });
//     }
//   };

// module.exports = auth;

const jwt = require('jsonwebtoken');
const secret = process.env.SECRET; // Access token secret
const refreshSecret = process.env.REFRESH_SECRET; // Refresh token secret

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const refreshAuthHeader = req.headers['x-refresh-token']; // Assuming refresh tokens are stored in secure cookies

  if (!authHeader) {
    return res.status(401).json({ message: 'No Authorization header provided' });
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : authHeader;

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    // Verify the access token
    const decoded = jwt.verify(token, secret);
    req.user = decoded; // Attach user data to the request object
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    if (err.name === 'TokenExpiredError' && refreshAuthHeader) {
      try {
        // Verify the refresh token
        const decodedRefresh = jwt.verify(refreshAuthHeader, refreshSecret);

        // Generate a new access token
        const newAccessToken = jwt.sign(
          { id: decodedRefresh.id, role: decodedRefresh.role }, // Include relevant user info
          secret,
          { expiresIn: '15m' } // Set a short expiry for the access token
        );

        // Optionally rotate the refresh token
        const newRefreshToken = jwt.sign(
          { id: decodedRefresh.id, role: decodedRefresh.role },
          refreshSecret,
          { expiresIn: '7d' } // Set a longer expiry for the refresh token
        );

        // // Send the new access and refresh tokens back to the client
        // res.setHeader('Authorization', `Bearer ${newAccessToken}`);
        // res.cookie('refreshToken', newRefreshToken, {
        //   httpOnly: true, // Prevent client-side access
        //   secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
        //   sameSite: 'strict',
        // });

        // // Attach the decoded user info to the request object
        // req.user = decodedRefresh;
        // next();
        // Send both tokens in the response body (NOT as headers)
        return res.json({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        });
      } catch (refreshErr) {
        console.error('Refresh token verification error:', refreshErr.message);
        return res.status(401).json({ message: 'Invalid or expired refresh token' });
      }
    } else {
      console.error('Token verification error:', err.message);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }
};

module.exports = auth;