import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export class NotFoundError extends Error {}
export class ValidationError extends Error {
  constructor(public issues: unknown, message = 'Validation failed') {
    super(message);
  }
}

export function errorHandler(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof ValidationError) {
    reply.status(400).send({ message: error.message, issues: error.issues });
    return;
  }
  if (error instanceof NotFoundError) {
    reply.status(404).send({ message: error.message });
    return;
  }
  if (error.validation) {
    reply.status(400).send({ message: 'Invalid request', issues: error.validation });
    return;
  }
  reply.status(error.statusCode ?? 500).send({ message: error.message ?? 'Internal Server Error' });
}
