import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { Student } from '../../students/entities/student.entity';
import { Teacher } from '../../teacher/entities/teacher.entity';
import { Lesson } from '../../lesson/entities/lesson.entity';
import { Payment } from '../../payment/entities/payment.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'varchar', length: 5, nullable: true })
  startTime: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  endTime: string;

  @Column({ type: 'varchar', array: true, nullable: true })
  daysOfWeek: string[];

  @Column({ type: 'enum', enum: ['active', 'completed', 'planned'], default: 'active' })
  status: 'active' | 'completed';

  @ManyToOne(() => Course, (course) => course.groups, { onDelete: 'CASCADE' })
  course: Course;

  @ManyToOne(() => Teacher, (teacher) => teacher.groups, { onDelete: 'SET NULL', nullable: true })
  teacher: Teacher;

  @ManyToMany(() => Student, (student) => student.groups, { cascade: true })
  @JoinTable()
  students: Student[];

  @OneToMany(() => Lesson, (lesson) => lesson.group)
  lessons: Lesson[];

  @OneToMany(() => Payment, (payment) => payment.group)
  payments: Payment[];

  @OneToMany(() => Attendance, (attendance) => attendance.lesson.group)
  attendances: Attendance[];
}