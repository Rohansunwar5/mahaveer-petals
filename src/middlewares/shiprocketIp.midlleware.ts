import { Request, Response, NextFunction } from 'express';

const allowedIps = (process.env.SHIPROCKET_ALLOWED_IPS || '')
  .split(',')
  .map(ip => ip.trim())
  .filter(Boolean);

export const shiprocketIpMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (allowedIps.length === 0) {
    // Fail open in dev
    return next();
  }

  const forwardedFor = req.headers['x-forwarded-for'] as string | undefined;
  const clientIp =
    forwardedFor?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    '';

  const isAllowed = allowedIps.some(ip => clientIp.includes(ip));

  if (!isAllowed) {
    return res.status(403).json({
      error: 'Forbidden – IP not allowed',
    });
  }

  next();
};
