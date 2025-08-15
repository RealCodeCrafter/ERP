import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Profile } from '../../profile/entities/profile.entity';

@Entity('super_admins')
export class SuperAdmin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  username: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'enum', enum: ['superAdmin'], default: 'superAdmin' })
  role: 'superAdmin';

  @Column({ type: 'varchar', length: 50 })
  firstName: string;

  @Column({ type: 'varchar', length: 50 })
  lastName: string;

  @Column({ type: 'varchar', length: 15 })
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'boolean', default: true })
  smsNotificationsEnabled: boolean;

  @OneToOne(() => Profile, (profile) => profile.SuperAdmin, { onDelete: 'CASCADE' })
  @JoinColumn()
  profile: Profile;
}