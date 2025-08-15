import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Group } from '../../groups/entities/group.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 , nullable: true})
  lessonName: string;

  @Column({ type: 'varchar', length: 50, default: 0 })
  lessonNumber: string;

  @Column({ type: 'timestamp' })
  lessonDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @ManyToOne(() => Group, (group) => group.lessons, { onDelete: 'CASCADE' })
  group: Group;

  @OneToMany(() => Attendance, (attendance) => attendance.lesson)
  attendances: Attendance[];
}