import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginPinDto } from './dto/login-pin.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login/pin')
  async loginWithPin(@Body() loginDto: LoginPinDto) {
    return this.authService.loginWithPin(loginDto);
  }
}
