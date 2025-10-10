import { describe, expect, it } from 'vitest';
import { requireRole } from '../src/auth/rbac.js';

function createReq(user?: any) {
  return {
    user,
    log: { error: () => {} }
  } as any;
}

function createReply() {
  const res: any = {
    statusCode: 200,
    code(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: any) {
      this.payload = payload;
      return this;
    }
  };
  return res;
}

describe('requireRole', () => {
  it('allows matching role', () => {
    const middleware = requireRole(['system_admin']);
    let called = false;
    middleware(createReq({ roles: ['system_admin'], permissions: [] }), createReply(), () => {
      called = true;
    });
    expect(called).toBe(true);
  });

  it('denies when role missing', () => {
    const middleware = requireRole(['system_admin']);
    const reply = createReply();
    middleware(createReq({ roles: ['employee'], permissions: [] }), reply, () => {});
    expect(reply.statusCode).toBe(403);
  });
});
