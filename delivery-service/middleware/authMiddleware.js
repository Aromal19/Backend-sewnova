const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
exports.authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const token = authHeader.substring(7);

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// Middleware to check if user is a vendor
exports.vendorOnly = (req, res, next) => {
    if (req.user && req.user.role === 'seller') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Vendor role required.'
        });
    }
};

// Middleware to check if user is a tailor
exports.tailorOnly = (req, res, next) => {
    if (req.user && req.user.role === 'tailor') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Tailor role required.'
        });
    }
};

// Middleware to check if user is a customer
exports.customerOnly = (req, res, next) => {
    if (req.user && req.user.role === 'customer') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Customer role required.'
        });
    }
};

// Middleware to check if user is an admin
exports.adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin role required.'
        });
    }
};

// Middleware to allow vendor or tailor
exports.vendorOrTailor = (req, res, next) => {
    if (req.user && (req.user.role === 'seller' || req.user.role === 'tailor')) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Vendor or Tailor role required.'
        });
    }
};

// Middleware to allow admin or tailor
exports.adminOrTailor = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'tailor')) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin or Tailor role required.'
        });
    }
};
// ALIASES & HELPERS
exports.protect = exports.authMiddleware;

// Generic Authorize Middleware
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Requires one of: ${roles.join(', ')}`
            });
        }
        next();
    };
};
