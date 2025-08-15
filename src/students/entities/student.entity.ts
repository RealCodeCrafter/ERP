import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { Group } from '../../groups/entities/group.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';
import { Profile } from '../../profile/entities/profile.entity';
import { Payment } from '../../payment/entities/payment.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  firstName: string;

  @Column({ type: 'varchar', length: 50 })
  lastName: string;

  @Column({ type: 'varchar', length: 15 })
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'enum', enum: ['student'], default: 'student' })
  role: 'student';

  @Column({ type: 'varchar', length: 50, nullable: true })
  username: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  parentsName: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  parentPhone: string;

  @ManyToMany(() => Group, (group) => group.students, { onDelete: 'CASCADE' })
  groups: Group[];

  @OneToMany(() => Attendance, (attendance) => attendance.student)
  attendances: Attendance[];

  @OneToOne(() => Profile, (profile) => profile.student, { onDelete: 'CASCADE' })
  @JoinColumn()
  profile: Profile;

  @OneToMany(() => Payment, (payment) => payment.student)
  payments: Payment[];
}