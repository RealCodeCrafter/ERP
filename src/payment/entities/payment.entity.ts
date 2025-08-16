import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Lesson } from '../../lesson/entities/lesson.entity';
import { Teacher } from '../../teacher/entities/teacher.entity';
import { Group } from '../../groups/entities/group.entity';
import { Course } from '../../courses/entities/course.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 , default: 0})
  amount: number;

  @ManyToOne(() => Student, (student) => student.payments, { onDelete: 'CASCADE' })
  student: Student;

  @ManyToOne(() => Group, (group) => group.payments, { onDelete: 'CASCADE' })
  group: Group;

  @ManyToOne(() => Course, (course) => course.payments, { onDelete: 'CASCADE' })
  course: Course;

  @Column({ type: 'varchar', nullable: true })
  adminStatus: string | null;

  @Column({ type: 'varchar', nullable: true })
  teacherStatus: string | null;

  @Column({ type: 'boolean', default: false })
  paid: boolean;

  @Column({ type: 'varchar', length: 7 , nullable: true})
  monthFor: string;

  @CreateDateColumn()
  createdAt: Date;
}