import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { registerAuthExtractor } from './auth/jwt.js';
import { iamRoutes } from './iam/routes.js';
import { hrRoutes } from './hr/routes.js';
import { financeRoutes } from './finance/routes.js';
import { errorHandler } from './common/errors.js';
import { activityRoutes } from './activity/routes.js';
import { scheduleDailySnapshots } from './activity/service.js';

const server = Fastify({
  logger: true
});

await server.register(cors, { origin: true, credentials: true });
await server.register(swagger, {
  swagger: {
    info: {
      title: 'ContractorPro API',
      version: '1.0.0'
    }
  }
});
await server.register(swaggerUi, {
  routePrefix: '/docs'
});

registerAuthExtractor(server);

iamRoutes(server);
hrRoutes(server);
financeRoutes(server);
activityRoutes(server);

server.setErrorHandler(errorHandler);

scheduleDailySnapshots(server);

const port = Number(process.env.PORT ?? 3000);
const host = '0.0.0.0';

server.ready().then(() => {
  server.swagger();
});

server.listen({ port, host }).then(() => {
  server.log.info(`Server listening on ${host}:${port}`);
}).catch((err) => {
  server.log.error(err);
  process.exit(1);
});
