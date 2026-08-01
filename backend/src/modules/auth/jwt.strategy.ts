import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma.service';

const getAdminEmails = () => (process.env.ADMIN_EMAILS || 'ronyrosene@gmail.com')
  .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: any) => {
          const cookie = request?.headers?.cookie || '';
          const match = cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
          return match ? decodeURIComponent(match[1]) : null;
        },
      ]),
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: { userId: number; email: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw new UnauthorizedException('Token inválido');
    let features: string[] = [];
    try { features = user.features ? JSON.parse(user.features) : []; } catch { features = []; }
    return {
      userId: user.id,
      email: user.email,
      features,
      isAdmin: getAdminEmails().includes(user.email.toLowerCase()) || features.includes('ADMIN_USUARIOS'),
    };
  }
}
