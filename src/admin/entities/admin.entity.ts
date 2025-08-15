import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Profile } from '../../profile/entities/profile.entity';

@Entity()
export class Admin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, default: 'admin'  })
  username: string;

  @Column({ type: 'varchar', length: 255 , nullable: true})
  password: string;

  @Column({ type: 'enum', enum: ['admin'], default: 'admin' })
  role: 'admin';

  @Column({ type: 'varchar', length: 50 })
  firstName: string;

  @Column({ type: 'varchar', length: 50 })
  lastName: string;

  @Column({ type: 'varchar', length: 15 })
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @OneToOne(() => Profile, (profile) => profile.admin, { onDelete: 'CASCADE' })
  @JoinColumn()
  profile: Profile;
}