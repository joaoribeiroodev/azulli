'use strict';

module.exports = function requireRole(...roles) {
  const allowed = new Set(roles);
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ erro: 'Não autenticado' });
    if (!allowed.has(req.auth.role)) {
      return res.status(403).json({ erro: 'Sem permissão para esta ação' });
    }
    next();
  };
};
