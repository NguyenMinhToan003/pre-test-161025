import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAccountDto, LoginDto } from './auth.dto';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { RoleBasedThrottlerGuard } from './passport/throttler.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() createAccountDto: CreateAccountDto) {
    return this.authService.register(createAccountDto);
  }

  @Post('login')
  login(@Body() body: LoginDto, @Res({ passthrough: true }) res) {
    return this.authService.login(body, res);
  }

  @UseGuards(JwtAuthGuard, RoleBasedThrottlerGuard)
  @Get('profile')
  getProfile(@Req() req) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { user } = req;
    return this.authService.getProfile(+user.id);
  }

  @Post('refresh')
  refresh(@Req() req, @Res({ passthrough: true }) res) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const refreshToken = req.cookies['refresh_token'];
    return this.authService.refresh(refreshToken, res);
  }
}
