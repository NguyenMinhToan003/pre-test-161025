import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateAccountDto, LoginDto } from './auth.dto';
import { AccountService } from 'src/account/account.service';
import { comparePassword } from 'src/utils/password';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Account } from 'src/account/entities/account.entities';

@Injectable()
export class AuthService {
  constructor(
    private readonly accountService: AccountService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    createAccountDto: CreateAccountDto,
  ): Promise<{ message: string }> {
    const existed = await this.accountService.findAccount(
      'username',
      createAccountDto.username,
    );
    if (existed) {
      throw new BadRequestException('Username already exists');
    }

    const account = await this.accountService.create(createAccountDto);
    return { message: `User ${account.username} registered successfully` };
  }
  private accessToken(payload: {
    sub: number;
    username: string;
    role: string;
  }) {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<number>('JWT_ACCESS_EXPIRES'),
    });
  }
  private refreshToken(payload: { sub: number }) {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<number>('JWT_REFRESH_EXPIRES'),
    });
  }

  async login(body: LoginDto, res) {
    const account = await this.accountService.findAccount(
      'username',
      body.username,
    );
    if (!account) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const isPasswordValid = await comparePassword(
      body.password,
      account.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload = {
      sub: account.id,
      username: account.username,
      role: account.role,
    };

    const accessToken = await this.accessToken(payload);
    const refreshToken = await this.refreshToken({ sub: account.id });

    await this.accountService.updateRefreshToken(account.id, refreshToken);
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/auth/refresh',
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: account.id,
        username: account.username,
        role: account.role,
      },
    };
  }

  async getProfile(
    userId: number,
  ): Promise<Omit<Account, 'password' | 'refreshToken'> | null> {
    const account = await this.accountService.findAccount('id', userId);
    if (account) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, refreshToken, ...profile } = account;
      return profile;
    }
    return null;
  }

  async refresh(refreshToken: string, res) {
    if (!refreshToken) {
      return { message: 'Vui long dang nhap lai' };
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload = await this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const userId = payload.sub;
      const account = await this.accountService.findAccount('id', +userId);

      if (
        !account ||
        !account.refreshToken ||
        !(await comparePassword(refreshToken, account.refreshToken))
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newAccessToken = await this.accessToken({
        sub: account.id,
        username: account.username,
        role: account.role,
      });
      const newRefreshToken = await this.refreshToken({ sub: account.id });
      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/api/auth/refresh',
      });
      await this.accountService.updateRefreshToken(+userId, newRefreshToken);
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
