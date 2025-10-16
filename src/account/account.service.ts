import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Account } from './entities/account.entities';
import { Repository } from 'typeorm';
import { ROLE_ENUM } from 'src/common/enum';
import { hashPassword } from 'src/utils/password';
import { CreateAccountDto } from 'src/auth/auth.dto';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
  ) {}

  async create(account: CreateAccountDto): Promise<Account> {
    return this.accountRepository.save({
      username: account.username,
      password: await hashPassword(account.password),
      role: account.role || ROLE_ENUM.USER,
    });
  }

  async findAccount<T extends keyof Omit<Account, 'password'>>(
    key: T,
    value: Account[T],
  ): Promise<Account | null> {
    return this.accountRepository.findOne({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      where: { [key]: value } as any,
    });
  }
  async updateRefreshToken(
    accountId: number,
    refreshToken: string,
  ): Promise<void> {
    await this.accountRepository.update(accountId, {
      refreshToken: await hashPassword(refreshToken),
      expiredAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
