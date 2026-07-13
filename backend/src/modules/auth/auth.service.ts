import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma.service';
import { LoginDto, RegisterDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email já cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
      },
    });

    const features = this.parseFeatures(user.features);
    const token = this.jwt.sign({ userId: user.id, email: user.email });
    return { token, user: { id: user.id, name: user.name, email: user.email, features } };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) throw new UnauthorizedException('Email ou senha incorretos');

    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) throw new UnauthorizedException('Email ou senha incorretos');

    const features = this.parseFeatures(user.features);
    const token = this.jwt.sign({ userId: user.id, email: user.email });
    return { token, user: { id: user.id, name: user.name, email: user.email, features } };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, features: true, createdAt: true },
    });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    return { ...user, features: this.parseFeatures(user.features) };
  }

  private parseFeatures(features: string | null): string[] {
    if (!features) return [];
    try { return JSON.parse(features); } catch { return []; }
  }
}
