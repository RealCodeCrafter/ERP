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

  @Column({ type: 'varchar', length: 5, nullable: true }) // HH:mm formati, masalan "09:00"
  startTime: string;

  @Column({ type: 'varchar', length: 5, nullable: true }) // HH:mm formati, masalan "11:00"
  endTime: string;

  @Column({ type: 'varchar', array: true, nullable: true }) // Haftaning kunlari, masalan ["Monday", "Wednesday", "Saturday"]
  daysOfWeek: string[];

  @Column({ type: 'enum', enum: ['active', 'frozen', 'completed'], default: 'active' })
  status: 'active' | 'frozen' | 'completed';

  @ManyToOne(() => Course, (course) => course.groups, { onDelete: 'CASCADE' })
  course: Course;

  @ManyToOne(() => Teacher, (teacher) => teacher.groups, { onDelete: 'CASCADE' })
  teacher: Teacher;

  @ManyToMany(() => Student, (student) => student.groups)
  @JoinTable()
  students: Student[];

  @OneToMany(() => Lesson, (lesson) => lesson.group)
  lessons: Lesson[];

  @OneToMany(() => Payment, (payment) => payment.group)
  payments: Payment[];

  @OneToMany(() => Attendance, (attendance) => attendance.lesson.group)
  attendances: Attendance[];
}