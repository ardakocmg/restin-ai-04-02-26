import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(venueId: string) {
    return this.prisma.user.findMany({
      where: { venueId },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        role: true,
        venueId: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async create(dto: CreateUserDto) {
    const pinHash = await bcrypt.hash(dto.pin, 10);
    
    return this.prisma.user.create({
      data: {
        username: dto.username,
        role: dto.role,
        pinHash,
        venueId: dto.venueId,
      },
      select: {
        id: true,
        username: true,
        role: true,
        venueId: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, data: Partial<CreateUserDto>) {
    const updateData: any = { ...data };
    
    if (data.pin) {
      updateData.pinHash = await bcrypt.hash(data.pin, 10);
      delete updateData.pin;
    }
    
    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        venueId: true,
        isActive: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
