import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  // Для звичайної реєстрації
  @Column({ nullable: true })
  passwordHash: string;

  @Column({ default: false })
  isActive: boolean;

  @Column({ type: 'datetime', nullable: true })
  deactivatedAt: Date | null;

  // Ліміт спроб входу
  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'datetime', nullable: true })
  lockedUntil: Date | null;

  // Для OAuth (Google)
  @Column({ type: 'text', nullable: true, unique: true })
  googleId: string | null;

  // Для 2FA
  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'text', nullable: true })
  twoFactorSecret: string | null;

  @Column({ type: 'text', nullable: true })
  twoFactorLoginCode: string | null;

  @Column({ type: 'datetime', nullable: true })
  twoFactorLoginCodeExpiresAt: Date | null;

  // Для відновлення пароля
  @Column({ type: 'text', nullable: true })
  resetPasswordToken: string | null;

  @Column({ type: 'datetime', nullable: true })
  resetPasswordExpires: Date | null;

  // Службові поля
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
