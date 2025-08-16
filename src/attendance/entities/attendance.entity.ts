import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Lesson } from '../../lesson/entities/lesson.entity';
import { Teacher } from '../../teacher/entities/teacher.entity';

@Entity('attendance')
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Student, (student) => student.attendances, { onDelete: 'CASCADE' })
  student: Student;

  @ManyToOne(() => Lesson, (lesson) => lesson.attendances, { onDelete: 'CASCADE' })
  lesson: Lesson;

  @Column({ type: 'enum', enum: ['present', 'absent', 'late'], default: 'absent' })
  status: 'present' | 'absent' | 'late';

  @ManyToOne(() => Teacher, teacher => teacher.attendances)
  teacher: Teacher;

  @CreateDateColumn()
  createdAt: Date;
}