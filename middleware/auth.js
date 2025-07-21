const admin = require('../config/firebase');

// Middleware para verificar autenticação Firebase
const authenticateFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Verificar se o header Authorization existe
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid Authorization header',
        message: 'Please provide a valid Firebase Auth token'
      });
    }

    // Extrair o token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'Missing token',
        message: 'No token provided in Authorization header'
      });
    }

    // Verificar e decodificar o token com Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Adicionar informações do usuário ao request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
      firebase: decodedToken
    };

    console.log(`🔐 User authenticated: ${decodedToken.email} (${decodedToken.uid})`);
    
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    
    // Diferentes tipos de erro
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please refresh your authentication token',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        error: 'Token revoked',
        message: 'Your authentication token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }
    
    if (error.code === 'auth/argument-error') {
      return res.status(401).json({
        error: 'Invalid token format',
        message: 'The provided token is malformed',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid or expired token',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Middleware para verificar se o usuário tem acesso a uma clínica específica
const authorizeClinicAccess = async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    const userUid = req.user.uid;

    console.log('🔍 authorizeClinicAccess debug:', {
      url: req.originalUrl,
      method: req.method,
      params: req.params,
      clinicId,
      userUid
    });

    if (!clinicId) {
      console.error('❌ Missing clinicId in params:', req.params);
      return res.status(400).json({
        error: 'Missing clinic ID',
        message: 'Clinic ID is required for this operation'
      });
    }

    console.log(`🔍 Authorizing clinic access: User ${userUid} for clinic ${clinicId}`);

    // TODO: TEMPORÁRIO - Para desenvolvimento sem credenciais Firebase configuradas
    // Em produção, você deve configurar as credenciais e usar a verificação completa
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️  DEVELOPMENT MODE: Skipping Firestore clinic access check');
      console.log('🔧 Configure Firebase credentials in .env for full authorization');
      
      // Adicionar dados fictícios para desenvolvimento
      req.userData = {
        id: userUid,
        clinicId: clinicId,
        role: 'owner',
        email: req.user.email
      };
      req.clinicId = clinicId;
      
      console.log(`✅ Clinic access authorized (DEV MODE): User ${userUid} accessing clinic ${clinicId}`);
      return next();
    }

    // Código original para produção (quando credenciais estiverem configuradas)
    const db = admin.firestore();
    
    // Verificar se o usuário tem acesso à clínica
    const userDoc = await db.collection('users').doc(userUid).get();
    
    if (!userDoc.exists) {
      return res.status(403).json({
        error: 'User not found',
        message: 'User profile not found in database'
      });
    }

    const userData = userDoc.data();
    
    // Verificar se o usuário pertence à clínica
    if (userData.clinicId !== clinicId) {
      console.warn(`🚫 Unauthorized access attempt: User ${userUid} tried to access clinic ${clinicId}, but belongs to ${userData.clinicId}`);
      
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this clinic',
        code: 'CLINIC_ACCESS_DENIED'
      });
    }

    // Adicionar dados do usuário e clínica ao request
    req.userData = userData;
    req.clinicId = clinicId;

    console.log(`✅ Clinic access authorized: User ${userUid} accessing clinic ${clinicId}`);
    
    next();
  } catch (error) {
    console.error('❌ Authorization error:', error);
    
    return res.status(500).json({
      error: 'Authorization check failed',
      message: 'Unable to verify clinic access',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Middleware para verificar roles específicos
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.userData?.role;
    
    if (!userRole) {
      return res.status(403).json({
        error: 'Role not found',
        message: 'User role not specified'
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This operation requires one of the following roles: ${allowedRoles.join(', ')}`,
        userRole,
        requiredRoles: allowedRoles
      });
    }

    console.log(`👤 Role authorized: ${userRole} for user ${req.user.uid}`);
    next();
  };
};

// Middleware para operações de admin apenas
const requireAdmin = requireRole(['admin', 'owner']);

// Middleware para operações que managers também podem fazer
const requireManager = requireRole(['admin', 'owner', 'manager']);

// Middleware de rate limiting por usuário
const userRateLimit = (maxRequests = 100, windowMinutes = 15) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const userId = req.user?.uid;
    if (!userId) return next();

    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    const userKey = userId;

    if (!requests.has(userKey)) {
      requests.set(userKey, []);
    }

    const userRequests = requests.get(userKey);
    
    // Remover requests antigas
    const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMinutes} minutes.`,
        retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
      });
    }

    validRequests.push(now);
    requests.set(userKey, validRequests);
    
    next();
  };
};

// Middleware para logging de ações sensíveis
const auditLog = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log apenas se a operação foi bem-sucedida
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`📋 AUDIT: ${action} | User: ${req.user.email} | Clinic: ${req.clinicId} | IP: ${req.ip} | Time: ${new Date().toISOString()}`);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  authenticateFirebaseToken,
  authorizeClinicAccess,
  requireRole,
  requireAdmin,
  requireManager,
  userRateLimit,
  auditLog
};
