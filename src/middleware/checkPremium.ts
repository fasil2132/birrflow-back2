// import { Request, Response, NextFunction } from 'express';
// import db from '../db';

// export const checkPremium = (feature: string) => {
//   return (req: Request, res: Response, next: NextFunction) => {
//     const userId = req.userId!;
//     const user = db.prepare('SELECT is_premium FROM users WHERE id = ?').get(userId);
    
//     if (!user.is_premium) {
//       const premiumFeatures = {
//         'advanced-forecast': true,
//         'export-data': true,
//         'sms-alerts': true
//       };
      
//       if (premiumFeatures[feature]) {
//         return res.status(402).json({ error: 'Premium feature required' });
//       }
//     }
    
//     next();
//   };
// };

