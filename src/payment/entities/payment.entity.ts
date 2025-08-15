import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Group } from '../../groups/entities/group.entity';
import { Course } from '../../courses/entities/course.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', default: 0 })
  amount: number;

  @ManyToOne(() => Student, (student) => student.payments, { onDelete: 'CASCADE' })
  student: Student;

  @ManyToOne(() => Group, (group) => group.payments, { onDelete: 'CASCADE' })
  group: Group;

  @ManyToOne(() => Course, (course) => course.payments, { onDelete: 'CASCADE' })
  course: Course;

  @Column({ type: 'varchar', default: 'accepted' })
  adminStatus: string;

  @Column({ type: 'varchar', nullable: true })
  teacherStatus: string | null;

  @Column({ type: 'boolean', default: false })
  paid: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}