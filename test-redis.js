const Redis = require('ioredis');
require('dotenv').config();

console.log('Testing Redis connection...');
console.log('REDIS_URL exists:', !!process.env.REDIS_URL);
console.log('REDIS_URL starts with rediss:', process.env.REDIS_URL?.startsWith('rediss://'));

const redis = new Redis(process.env.REDIS_URL, {
  tls: {
    rejectUnauthorized: false
  },
  connectTimeout: 15000,
  retryStrategy(times) {
    console.log(`Retry attempt ${times}`);
    if (times > 3) {
      console.log('Max retries reached, giving up');
      return null;
    }
    return Math.min(times * 1000, 3000);
  }
});

redis.on('connect', () => {
  console.log('✅ Redis Cloud connected successfully!');
  redis.disconnect();
  process.exit(0);
});

redis.on('error', (err) => {
  console.log('❌ Redis connection error:', err.message);
  console.log('Error code:', err.code);
  console.log('Error stack:', err.stack);
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('Redis reconnecting...');
});

setTimeout(() => {
  console.log('⏰ Connection timeout - giving up');
  redis.disconnect();
  process.exit(1);
}, 20000);
