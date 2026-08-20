import { randomBytes, randomUUID } from 'crypto';
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { sign } from 'jsonwebtoken';
import { validationProblem } from '../common/problem-details';
import { PrismaService } from '../database/prisma.service';
import { hashPassword, verifyPassword } from '../auth/password-hasher';
import { LoginDto, RegisterDto, UpdateProfileDto } from './account.dto';

export interface UserResponse {
  username: string | null;
  email: string | null;
  token: string;
  refreshToken: string | null;
}

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private async rolesFor(userId: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { UserId: userId },
      select: { role: { select: { Name: true } } },
    });
    return rows.map((row) => row.role.Name).filter((name): name is string => Boolean(name));
  }

  private async tokenFor(user: User): Promise<string> {
    const roles = await this.rolesFor(user.Id);
    const role: string | string[] | undefined = roles.length === 0 ? undefined : roles.length === 1 ? roles[0] : roles;
    return sign(
      { nameid: user.Id, email: user.Email, unique_name: user.UserName, ...(role ? { role } : {}) },
      this.config.getOrThrow<string>('JWT_SECRET'),
      { algorithm: 'HS512', expiresIn: '7d' },
    );
  }

  private refreshToken(): string {
    return randomBytes(64).toString('base64');
  }

  private async response(user: User, refreshToken: string | null): Promise<UserResponse> {
    return { username: user.UserName, email: user.Email, token: await this.tokenFor(user), refreshToken };
  }

  async login(dto: LoginDto): Promise<UserResponse> {
    const user = await this.prisma.user.findFirst({ where: { NormalizedUserName: dto.username.toUpperCase() } });
    if (!user || !verifyPassword(dto.password, user.PasswordHash)) throw new UnauthorizedException();

    const refreshToken = this.refreshToken();
    const updated = await this.prisma.user.update({
      where: { Id: user.Id },
      data: { RefreshToken: refreshToken, RefreshTokenExpiryTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
    return this.response(updated, refreshToken);
  }

  async refresh(refreshToken: string): Promise<UserResponse> {
    const user = await this.prisma.user.findFirst({ where: { RefreshToken: refreshToken } });
    if (!user || user.RefreshTokenExpiryTime <= new Date()) throw new UnauthorizedException();
    const rotated = this.refreshToken();
    const updated = await this.prisma.user.update({
      where: { Id: user.Id },
      data: { RefreshToken: rotated, RefreshTokenExpiryTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
    return this.response(updated, rotated);
  }

  private passwordErrors(password: string): string[] {
    const errors: string[] = [];
    if (password.length < 6) errors.push('Passwords must be at least 6 characters.');
    if (!/[^a-zA-Z0-9]/.test(password)) errors.push("Passwords must have at least one non alphanumeric character.");
    if (!/[0-9]/.test(password)) errors.push("Passwords must have at least one digit ('0'-'9').");
    if (!/[a-z]/.test(password)) errors.push("Passwords must have at least one lowercase ('a'-'z').");
    if (!/[A-Z]/.test(password)) errors.push("Passwords must have at least one uppercase ('A'-'Z').");
    return errors;
  }

  async register(dto: RegisterDto): Promise<void> {
    const errors: Record<string, string[]> = {};
    if (await this.prisma.user.findFirst({ where: { NormalizedUserName: dto.username.toUpperCase() }, select: { Id: true } })) {
      errors.DuplicateUserName = [`Username '${dto.username}' is already taken.`];
    }
    if (await this.prisma.user.findFirst({ where: { NormalizedEmail: dto.email.toUpperCase() }, select: { Id: true } })) {
      errors.DuplicateEmail = [`Email '${dto.email}' is already taken.`];
    }
    const passwordErrors = this.passwordErrors(dto.password);
    if (passwordErrors.length) errors.Password = passwordErrors;
    if (Object.keys(errors).length) throw validationProblem(errors);

    const user = {
      Id: randomUUID(), UserName: dto.username, NormalizedUserName: dto.username.toUpperCase(),
      Email: dto.email, NormalizedEmail: dto.email.toUpperCase(), EmailConfirmed: false,
      PasswordHash: hashPassword(dto.password), SecurityStamp: randomUUID(),
      ConcurrencyStamp: randomUUID(), PhoneNumber: null, PhoneNumberConfirmed: false,
      TwoFactorEnabled: false, LockoutEnd: null, LockoutEnabled: true, AccessFailedCount: 0,
      RefreshToken: null, RefreshTokenExpiryTime: new Date(0),
    };

    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.create({ data: user });
      await transaction.userRole.create({ data: { UserId: user.Id, RoleId: '1' } });
    });
  }

  async currentUser(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({ where: { Id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.response(user, null);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({ where: { Id: userId } });
    if (!user) throw new UnauthorizedException();

    if (dto.newPassword) {
      if (!dto.currentPassword) throw validationProblem({ CurrentPassword: ['Current password is required to set a new password.'] });
      if (!verifyPassword(dto.currentPassword, user.PasswordHash)) {
        throw validationProblem({ PasswordMismatch: ['Incorrect password.'] });
      }
      const passwordErrors = this.passwordErrors(dto.newPassword);
      if (passwordErrors.length) throw validationProblem({ Password: passwordErrors });
      user.PasswordHash = hashPassword(dto.newPassword);
      user.SecurityStamp = randomUUID();
    }

    user.UserName = dto.username;
    user.NormalizedUserName = dto.username.toUpperCase();
    user.Email = dto.email;
    user.NormalizedEmail = dto.email.toUpperCase();
    user.ConcurrencyStamp = randomUUID();
    const updated = await this.prisma.user.update({
      where: { Id: user.Id },
      data: {
        UserName: user.UserName, NormalizedUserName: user.NormalizedUserName,
        Email: user.Email, NormalizedEmail: user.NormalizedEmail,
        PasswordHash: user.PasswordHash, SecurityStamp: user.SecurityStamp,
        ConcurrencyStamp: user.ConcurrencyStamp,
      },
    });
    return this.response(updated, updated.RefreshToken);
  }
}
