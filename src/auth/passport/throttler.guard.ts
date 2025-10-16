import {
  ThrottlerGuard,
  ThrottlerException,
  ThrottlerRequest,
} from '@nestjs/throttler';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { NUMBER_REQUEST_ROLE_LIMIT_ENUM, ROLE_ENUM } from 'src/common/enum';

@Injectable()
export class RoleBasedThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const role = req.user?.role || ROLE_ENUM.USER;
    return req.user?.id ? `user-${req.user.id}-${role}` : `ip-${req.ip}`;
  }

  protected getLimit(context: ExecutionContext): number {
    const req = context.switchToHttp().getRequest();
    const role = req.user?.role || ROLE_ENUM.USER;

    switch (role) {
      case ROLE_ENUM.ADMIN:
        return NUMBER_REQUEST_ROLE_LIMIT_ENUM.ADMIN;
      case ROLE_ENUM.USER:
        return NUMBER_REQUEST_ROLE_LIMIT_ENUM.USER;
      default:
        return NUMBER_REQUEST_ROLE_LIMIT_ENUM.USER;
    }
  }

  async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, ttl, blockDuration } = requestProps;
    const req = context.switchToHttp().getRequest();

    const key = await this.getTracker(req);
    const limit = this.getLimit(context);
    const role = req.user?.role || 'guest';

    console.log(`[RateLimit] Checking rate limit for key: ${key}, role: ${role}`);

    const record = await this.storageService.increment(
      key,
      ttl,
      limit,
      blockDuration,
      'role-based-throttler-request',
    );

    console.log(
      `[RateLimit] Key: ${key} | Role: ${role} | Hits: ${record.totalHits}/${limit}`,
    );

    if (record.totalHits > limit) {
      throw new ThrottlerException(
        `You have exceeded the request limit of ${limit} requests per minute.`,
      );
    }

    return true;
  }
}
