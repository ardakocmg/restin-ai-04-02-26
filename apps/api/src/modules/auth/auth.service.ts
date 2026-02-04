import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginPinDto } from './dto/login-pin.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async loginWithPin(loginDto: LoginPinDto) {
    const { username, pin } = loginDto;
    
    const user = await this.usersService.findByUsername(username);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPinValid = await bcrypt.compare(pin, user.pinHash);
    if (!isPinValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { 
      sub: user.id, 
      username: user.username, 
      role: user.role,
      venueId: user.venueId 
    };

    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        venueId: user.venueId,
      },
    };
  }

  async hashPin(pin: string): Promise<string> {
    return bcrypt.hash(pin, 10);
  }
}
