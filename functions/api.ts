import serverless from 'serverless-http';
import { createServer } from '../server';

const appPromise = createServer();

export const handler = async (event: any, context: any) => {
  const app = await appPromise;
  const handler = serverless(app);
  return handler(event, context);
};
