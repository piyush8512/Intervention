import * as db from '../config/db.js';
import { getIO } from './socketService.js';

export const startFailSafeJob = () => {
  setInterval(runFailSafeCheck, 60 * 60 * 1000); 
  runFailSafeCheck(); 
};

async function runFailSafeCheck() {
  try {
    console.log('[FAIL-SAFE] Running background check...');
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    
  } catch (err) {
    console.error('[FAIL-SAFE] Error:', err);
  }
}