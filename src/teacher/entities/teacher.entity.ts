import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { Profile } from '../../profile/entities/profile.entity';
import { Group } from '../../groups/entities/group.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';

@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  firstName: string;

  @Column({ type: 'varchar', length: 50 })
  lastName: string;

  @Column({ type: 'varchar', length: 100 })
  username: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 15 })
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 100 })
  specialty: string;

  @Column({ type: 'enum', enum: ['teacher'], default: 'teacher' })
  role: 'teacher';

  @OneToOne(() => Profile, (profile) => profile.teacher, { onDelete: 'CASCADE' })
  @JoinColumn()
  profile: Profile;

  @OneToMany(() => Group, (group) => group.teacher)
  groups: Group[];

  @OneToMany(() => Attendance, attendance => attendance.teacher)
attendances: Attendance[];

}