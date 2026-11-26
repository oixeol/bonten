export interface EnvironmentConfig {
  frontendOrigin: string;
  apiUrl: string;
  sessionSecret: string;
  sessionTtlSeconds: number;
  internalServiceSecret: string;
  csrf: { cookie: { sameSite: 'strict' | 'lax' | 'none'; secure: boolean; httpOnly: boolean; domain?: string }; cookieName: string };
  cors: { origin: string };
  redis: { host: string; port: number; password: string };
  livekit: { apiKey: string; apiSecret: string; wsUrl: string; dockerUrl: string };
  giphy: { apiKey: string };
  klipy: { appKey: string };
  s3: { endpoint: string; region: string; bucket: string; accessKey: string; secretKey: string; forcePathStyle: boolean; publicUrl: string };
  seaport: { port: number };
}

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
};

export default () => ({
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  sessionSecret: required('SESSION_SECRET'),
  internalServiceSecret: required('INTERNAL_SERVICE_SECRET'),
  sessionTtlSeconds: parseInt(process.env.SESSION_TTL_SECONDS ?? '604800', 10),
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? '',
  },
  livekit: {
    apiKey: required('LIVEKIT_API_KEY'),
    apiSecret: required('LIVEKIT_API_SECRET'),
    wsUrl: process.env.LIVEKIT_WS_URL ?? 'ws://localhost:7880',
    dockerUrl: process.env.LIVEKIT_DOCKER_URL ?? 'http://livekit:7880',
  },
  giphy: {
    apiKey: process.env.GIPHY_API_KEY ?? '',
  },
  klipy: {
    appKey: process.env.KLIPY_APP_KEY ?? '',
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:8333',
    region: process.env.S3_REGION ?? 'us-east-1',
    bucket: process.env.S3_BUCKET ?? 'bonten-media',
    accessKey: process.env.S3_ACCESS_KEY ?? '',
    secretKey: process.env.S3_SECRET_KEY ?? '',
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    publicUrl:
      process.env.S3_PUBLIC_URL ??
      process.env.NEXT_PUBLIC_S3_PUBLIC_URL ??
      '',
  },
}) as EnvironmentConfig;