import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hash, compare } from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { SanitizedUser } from './users.types';
import { UserRole, USER_ROLES } from './user-role.type';

const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  private sanitizeUser(user: User): SanitizedUser {
    const { passwordHash, ...rest } = user;
    return rest as SanitizedUser;
  }

  async create(
    createUserDto: CreateUserDto,
    options?: { allowAdminRole?: boolean },
  ): Promise<SanitizedUser> {
    const existing = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const isFirstUser = (await this.usersRepository.count()) === 0;

    const role = this.resolveRole(
      createUserDto.role,
      options?.allowAdminRole ?? false,
      isFirstUser,
    );

    const user = this.usersRepository.create({
      name: createUserDto.name,
      email: createUserDto.email,
      passwordHash: await hash(createUserDto.password, PASSWORD_SALT_ROUNDS),
      role,
    });

    const saved = await this.usersRepository.save(user);
    return this.sanitizeUser(saved);
  }

  async findAll(): Promise<SanitizedUser[]> {
    const users = await this.usersRepository.find();
    return users.map((user) => this.sanitizeUser(user));
  }

  async findById(id: string): Promise<SanitizedUser | null> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['organizations'],
    });
    return user ? this.sanitizeUser(user) : null;
  }

  async findEntityById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async update(
    id: string,
    updateDto: UpdateUserDto,
    options?: { allowRoleChange?: boolean },
  ): Promise<SanitizedUser> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateDto.email && updateDto.email !== user.email) {
      const emailExists = await this.usersRepository.findOne({
        where: { email: updateDto.email },
      });
      if (emailExists) {
        throw new ConflictException('Email is already registered');
      }
      user.email = updateDto.email;
    }

    if (updateDto.name) {
      user.name = updateDto.name;
    }

    if (updateDto.password) {
      user.passwordHash = await hash(updateDto.password, PASSWORD_SALT_ROUNDS);
    }

    if (updateDto.role) {
      if (!options?.allowRoleChange) {
        throw new ForbiddenException('You are not allowed to change roles');
      }
      user.role = this.resolveRole(updateDto.role, true);
    }

    const saved = await this.usersRepository.save(user);
    return this.sanitizeUser(saved);
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('User not found');
    }
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      return null;
    }

    const isMatch = await compare(password, user.passwordHash);
    if (!isMatch) {
      return null;
    }

    return user;
  }

  async saveRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      refreshToken: token,
      refreshTokenExpiresAt: expiresAt,
    });
  }

  async findByRefreshToken(refreshToken: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { refreshToken },
    });
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      refreshToken: null,
      refreshTokenExpiresAt: null,
    });
  }

  private resolveRole(
    role: UserRole | undefined,
    allowAdminRole: boolean,
    isFirstUser = false,
  ): UserRole {
    if (role && !USER_ROLES.includes(role)) {
      throw new BadRequestException('Invalid role provided');
    }

    if (!role) {
      return isFirstUser ? 'admin' : 'staff';
    }

    if (role === 'admin' && !allowAdminRole) {
      throw new ForbiddenException('Only admins can assign the admin role');
    }

    return role;
  }
}

