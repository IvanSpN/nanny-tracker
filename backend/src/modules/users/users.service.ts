import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { User } from './models/user.model';
import { CreateUserData } from './types/create-user-data.type';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userModel.findByPk(id);
  }

  async findByLogin(login: string): Promise<User | null> {
    return this.userModel.findOne({
      where: { login },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({
      where: { email },
    });
  }

  async create(data: CreateUserData, transaction?: Transaction): Promise<User> {
    return this.userModel.create(
      {
        login: data.login,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        isInitialPasswordChanged: data.isInitialPasswordChanged ?? true,
      },
      {
        transaction,
      },
    );
  }

  async updatePassword(
    userId: string,
    passwordHash: string,
    transaction?: Transaction,
    isInitialPasswordChanged = true,
  ): Promise<void> {
    await this.userModel.update(
      {
        passwordHash,
        isInitialPasswordChanged,
      },
      {
        where: { id: userId },
        transaction,
      },
    );
  }
}
