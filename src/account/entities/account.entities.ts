import { ROLE_ENUM } from 'src/common/enum';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Account {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ name: 'role', default: ROLE_ENUM.USER })
  role: string;

  @Column({ name: 'refresh_token', nullable: true, type: 'text' })
  refreshToken: string | null;

  @Column({ name: 'expired_at', type: 'bigint', nullable: true })
  expiredAt: number | null;
}
