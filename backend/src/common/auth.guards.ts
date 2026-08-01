import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY, REQUIRED_FEATURES_KEY } from './auth.decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic ? true : super.canActivate(context);
  }
}

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_FEATURES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest().user;
    if (user?.isAdmin) return true;
    const features: string[] = user?.features || [];
    if (!required.some((feature) => features.includes(feature))) {
      throw new ForbiddenException('Usuário sem permissão para esta funcionalidade');
    }
    return true;
  }
}

type Bucket = { count: number; resetAt: number };

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const path = request.originalUrl || request.url || '';
    const now = Date.now();
    const isLogin = path.includes('/auth/login');
    const isUpload = path.includes('/upload');
    const windowMs = isLogin ? 15 * 60_000 : 60_000;
    const limit = isLogin ? 10 : isUpload ? 20 : 300;
    const identity = request.user?.userId || request.ip || request.socket?.remoteAddress || 'unknown';
    const key = `${identity}:${isLogin ? 'login' : isUpload ? 'upload' : 'default'}`;
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    this.buckets.set(key, bucket);

    if (bucket.count > limit) {
      throw new HttpException('Muitas tentativas. Aguarde e tente novamente.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (this.buckets.size > 10_000) {
      for (const [bucketKey, value] of this.buckets) {
        if (value.resetAt <= now) this.buckets.delete(bucketKey);
      }
    }
    return true;
  }
}
