import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Student } from '../students/entities/student.entity';
import { Group } from '../groups/entities/group.entity';
import { Course } from '../courses/entities/course.entity';
import { Teacher } from '../teacher/entities/teacher.entity';
import { Lesson } from '../lesson/entities/lesson.entity';
import { GroupsService } from '../groups/group.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    private readonly groupsService: GroupsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const { studentId, groupId, courseId, amount } = createPaymentDto;

    const student = await this.studentRepository.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // To'lov guruhning narxiga mos kelishini tekshirish
    const paid = amount >= group.price;

    const payment = this.paymentRepository.create({
      amount,
      student,
      group,
      course,
      adminStatus: 'accepted',
      teacherStatus: null,
      paid,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    if (paid && !group.students.some(s => s.id === studentId)) {
      await this.groupsService.restoreStudentToGroup(groupId, studentId);
    }

    return savedPayment;
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentRepository.find({
      relations: ['student', 'group', 'group.teacher', 'course'],
    });
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['student', 'group', 'group.teacher', 'course'],
    });
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return payment;
  }

  async confirmTeacher(id: number, teacherId: number): Promise<Payment> {
    const payment = await this.findOne(id);
    const group = await this.groupRepository.findOne({
      where: { id: payment.group.id },
      relations: ['teacher', 'students'],
    });
    if (group.teacher.id !== teacherId) {
      throw new ForbiddenException('You can only confirm payments for your own group');
    }
    payment.teacherStatus = 'accepted';

    // To'lov guruhning narxiga mos kelishini tekshirish
    payment.paid = payment.adminStatus === 'accepted' && payment.teacherStatus === 'accepted' && payment.amount >= group.price;

    const savedPayment = await this.paymentRepository.save(payment);

    if (payment.paid && !group.students.some(s => s.id === payment.student.id)) {
      await this.groupsService.restoreStudentToGroup(payment.group.id, payment.student.id);
      if (payment.student.parentPhone) {
        await this.sendSMS(
          payment.student.parentPhone,
          `Hurmatli ${payment.student.parentsName}, ${payment.group.name} guruhi uchun to'lov tasdiqlandi. O'quvchi guruhga qayta qo'shildi.`,
        );
      }
    }

    return savedPayment;
  }

  async update(id: number, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(id);
    let group = payment.group;

    if (updatePaymentDto.studentId) {
      const student = await this.studentRepository.findOne({ where: { id: updatePaymentDto.studentId } });
      if (!student) {
        throw new NotFoundException(`Student with ID ${updatePaymentDto.studentId} not found`);
      }
      payment.student = student;
    }
    if (updatePaymentDto.groupId) {
      group = await this.groupRepository.findOne({ where: { id: updatePaymentDto.groupId } });
      if (!group) {
        throw new NotFoundException(`Group with ID ${updatePaymentDto.groupId} not found`);
      }
      payment.group = group;
    }
    if (updatePaymentDto.courseId) {
      const course = await this.courseRepository.findOne({ where: { id: updatePaymentDto.courseId } });
      if (!course) {
        throw new NotFoundException(`Course with ID ${updatePaymentDto.courseId} not found`);
      }
      payment.course = course;
    }
    if (updatePaymentDto.amount !== undefined) {
      payment.amount = updatePaymentDto.amount;
    }

    // To'lov guruhning narxiga mos kelishini tekshirish
    payment.paid = payment.adminStatus === 'accepted' && payment.teacherStatus === 'accepted' && payment.amount >= group.price;

    const savedPayment = await this.paymentRepository.save(payment);

    if (payment.paid && !group.students.some(s => s.id === payment.student.id)) {
      await this.groupsService.restoreStudentToGroup(payment.group.id, payment.student.id);
      if (payment.student.parentPhone) {
        await this.sendSMS(
          payment.student.parentPhone,
          `Hurmatli ${payment.student.parentsName}, ${payment.group.name} guruhi uchun to'lov tasdiqlandi. O'quvchi guruhga qayta qo'shildi.`,
        );
      }
    }

    return savedPayment;
  }

  async remove(id: number): Promise<void> {
    const payment = await this.findOne(id);
    await this.paymentRepository.remove(payment);
  }

  async searchPayments(studentName: string, groupId: number, status: string): Promise<Payment[]> {
    const query: any = {};
    if (studentName) {
      query.student = [
        { firstName: ILike(`%${studentName}%`) },
        { lastName: ILike(`%${studentName}%`) },
      ];
    }
    if (groupId) {
      query.group = { id: groupId };
    }
    if (status) {
      query.adminStatus = status;
    }
    return this.paymentRepository.find({
      where: query,
      relations: ['student', 'group', 'group.teacher', 'course'],
    });
  }

  async findPaidPayments(studentName: string, groupId: number): Promise<Payment[]> {
    const query: any = { paid: true };
    if (studentName) {
      query.student = [
        { firstName: ILike(`%${studentName}%`) },
        { lastName: ILike(`%${studentName}%`) },
      ];
    }
    if (groupId) {
      query.group = { id: groupId };
    }
    return this.paymentRepository.find({
      where: query,
      relations: ['student', 'group', 'course'],
    });
  }

  async findUnpaidPayments(studentName: string, groupId: number): Promise<Payment[]> {
    const query: any = { paid: false };
    if (studentName) {
      query.student = [
        { firstName: ILike(`%${studentName}%`) },
        { lastName: ILike(`%${studentName}%`) },
      ];
    }
    if (groupId) {
      query.group = { id: groupId };
    }
    return this.paymentRepository.find({
      where: query,
      relations: ['student', 'group', 'course'],
    });
  }

  async getMonthlyIncome(month: number, year: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const payments = await this.paymentRepository.find({
      where: {
        paid: true,
        createdAt: Between(startDate, endDate),
      },
    });
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  }

  async getYearlyIncome(year: number): Promise<number> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const payments = await this.paymentRepository.find({
      where: {
        paid: true,
        createdAt: Between(startDate, endDate),
      },
    });
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  }

  async sendSMS(phone: string, message: string): Promise<void> {
    const smsApiUrl = this.configService.get<string>('SMS_API_URL');
    const smsApiToken = this.configService.get<string>('SMS_API_TOKEN');

    try {
      await firstValueFrom(
        this.httpService.post(
          smsApiUrl,
          {
            mobile_phone: phone,
            message,
            from: '4546',
          },
          {
            headers: { Authorization: `Bearer ${smsApiToken}` },
          },
        ),
      );
    } catch (error) {
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  @Cron('0 0 9 * * *', { name: 'checkPaymentReminders' })
  async checkPaymentReminders() {
    const today = new Date();
    const students = await this.studentRepository.find({
      relations: ['groups', 'payments'],
    });

    for (const student of students) {
      for (const group of student.groups) {
        const firstLessonDate = await this.getFirstLessonDate(group.id);
        if (!firstLessonDate) continue;

        const { paymentDueDate, reminderDate } = this.calculatePaymentDates(firstLessonDate, today);
        const daysUntilDue = this.getDaysUntilDue(today, paymentDueDate);
        const daysUntilReminder = this.getDaysUntilDue(today, reminderDate);

        if (daysUntilReminder === 0 || daysUntilDue === 0) {
          const payment = await this.paymentRepository.findOne({
            where: {
              student: { id: student.id },
              group: { id: group.id },
              paid: false,
            },
            relations: ['student', 'group', 'course'],
            order: { createdAt: 'DESC' },
          });

          if (payment && payment.student.parentPhone) {
            const message =
              daysUntilReminder === 0
                ? `Hurmatli ${payment.student.parentsName}, ${payment.group.name} guruhi uchun ${payment.amount} so'm to'lovni amalga oshirishingiz kerak.`
                : `Hurmatli ${payment.student.parentsName}, ${payment.group.name} guruhi uchun ${payment.amount} so'm to'lov bugun oxirgi muddat. To'lov qilinmasa o'quvchi guruhdan vaqtincha chetlashtiriladi.`;
            await this.sendSMS(payment.student.parentPhone, message);

            if (daysUntilDue === 0 && !payment.paid) {
              await this.groupsService.removeStudentFromGroup(group.id, student.id);
              await this.sendSMS(
                payment.student.parentPhone,
                `Hurmatli ${payment.student.parentsName}, ${payment.group.name} guruhi uchun to'lov muddati tugadi. O'quvchi guruhdan vaqtincha chetlashtirildi.`,
              );
            }
          }
        }
      }
    }
  }

  private async getFirstLessonDate(groupId: number): Promise<Date | null> {
    const lesson = await this.lessonRepository.findOne({
      where: { group: { id: groupId } },
      order: { lessonDate: 'ASC' },
    });
    return lesson ? lesson.lessonDate : null;
  }

  private calculatePaymentDates(firstLessonDate: Date, currentDate: Date): { paymentDueDate: Date; reminderDate: Date } {
    const firstLessonDay = firstLessonDate.getDate();
    let dueYear = currentDate.getFullYear();
    let dueMonth = currentDate.getMonth();
    let reminderYear = dueYear;
    let reminderMonth = dueMonth;

    // Calculate the next payment due date (30 days from first lesson date)
    const daysSinceFirstLesson = Math.floor(
      (currentDate.getTime() - firstLessonDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysInCycle = daysSinceFirstLesson % 30;
    let daysUntilNextDue = 30 - daysInCycle;
    if (daysUntilNextDue <= 0) {
      daysUntilNextDue += 30;
      dueMonth += 1;
      if (dueMonth > 11) {
        dueMonth = 0;
        dueYear += 1;
      }
    }

    const paymentDueDate = new Date(currentDate);
    paymentDueDate.setDate(currentDate.getDate() + daysUntilNextDue);
    paymentDueDate.setHours(0, 0, 0, 0);

    // Calculate reminder date (10 days after the start of the payment cycle)
    const reminderDaysSinceCycleStart = daysInCycle >= 10 ? daysInCycle - 10 : 20 + daysInCycle;
    const reminderDate = new Date(currentDate);
    reminderDate.setDate(currentDate.getDate() - reminderDaysSinceCycleStart);
    reminderDate.setHours(0, 0, 0, 0);

    return { paymentDueDate, reminderDate };
  }

  private getDaysUntilDue(currentDate: Date, dueDate: Date): number {
    const diffTime = dueDate.getTime() - currentDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}