import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { Group } from '../../groups/entities/group.entity';
import { Payment } from '../../payment/entities/payment.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @ManyToMany(() => Group, (group) => group.course)
  @JoinTable()
  groups: Group[];

  @OneToMany(() => Payment, (payment) => payment.course)
  payments: Payment[];
}