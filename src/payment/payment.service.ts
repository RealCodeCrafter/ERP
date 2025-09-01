import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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
  const { studentId, groupId, courseId, monthFor, amount } = createPaymentDto;

  const student = await this.studentRepository.findOne({ where: { id: studentId } });
  if (!student) {
    throw new NotFoundException(`Student with ID ${studentId} not found`);
  }

  const group = await this.groupRepository.findOne({ where: { id: groupId, status: 'active' } });
  if (!group) {
    throw new NotFoundException(`Active group with ID ${groupId} not found`);
  }

  const course = await this.courseRepository.findOne({ where: { id: courseId } });
  if (!course) {
    throw new NotFoundException(`Course with ID ${courseId} not found`);
  }

  if (!monthFor || !/^\d{4}-\d{2}$/.test(monthFor)) {
    throw new BadRequestException('monthFor must be in YYYY-MM format');
  }

  const groupPrice = Number(group.price);
  if (isNaN(groupPrice) || groupPrice <= 0) {
    throw new BadRequestException(`Invalid group price for group ID ${groupId}`);
  }

  const paymentAmount = Number(amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    throw new BadRequestException('Payment amount must be a positive number');
  }

  if (paymentAmount > groupPrice) {
    throw new BadRequestException(`Payment amount cannot exceed group price of ${groupPrice}`);
  }

  const payment = this.paymentRepository.create({
    amount: paymentAmount,
    student,
    group,
    course,
    adminStatus: 'accepted',
    teacherStatus: 'pending',
    paid: false,
    monthFor,
  });

  return this.paymentRepository.save(payment);
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
    where: { id: payment.group.id, status: 'active' },
    relations: ['teacher', 'students'],
  });
  if (!group) {
    throw new NotFoundException(`Active group with ID ${payment.group.id} not found`);
  }

  if (group.teacher.id !== teacherId) {
    throw new ForbiddenException('You can only confirm payments for your own group');
  }

  // O‘qituvchi tasdiqlaydi
  payment.teacherStatus = 'accepted';

  // 🔎 Shu student + group + monthFor bo‘yicha tasdiqlangan to‘lovlarni yig‘amiz
  const confirmedPayments = await this.paymentRepository.find({
    where: {
      student: payment.student,
      group: payment.group,
      course: payment.course,
      monthFor: payment.monthFor,
      teacherStatus: 'accepted',
    },
  });

  const totalPaid = confirmedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Agar umumiy to‘lov group.price ga teng yoki katta bo‘lsa → barcha yozuvlar paid=true bo‘ladi
  if (totalPaid >= Number(group.price)) {
    for (const p of confirmedPayments) {
      p.paid = true;
    }
    await this.paymentRepository.save(confirmedPayments);
  }

  return this.paymentRepository.save(payment);
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
      group = await this.groupRepository.findOne({ where: { id: updatePaymentDto.groupId, status: 'active' } });
      if (!group) {
        throw new NotFoundException(`Active group with ID ${updatePaymentDto.groupId} not found`);
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
    if (updatePaymentDto.monthFor) {
      if (!/^\d{4}-\d{2}$/.test(updatePaymentDto.monthFor)) {
        throw new BadRequestException('monthFor must be in YYYY-MM format');
      }
      payment.monthFor = updatePaymentDto.monthFor;
    }

    payment.paid = payment.adminStatus === 'accepted' && payment.teacherStatus === 'accepted' && payment.amount >= group.price;
    return this.paymentRepository.save(payment);
  }

  async remove(id: number): Promise<void> {
    const payment = await this.findOne(id);
    await this.paymentRepository.remove(payment);
  }

  async findPaidPayments(studentName: string, groupId: number, monthFor: string): Promise<Payment[]> {
    const query: any = { paid: true };
    if (studentName) {
      query.student = [
        { firstName: ILike(`%${studentName}%`) },
        { lastName: ILike(`%${studentName}%`) },
      ];
    }
    if (groupId) {
      query.group = { id: groupId, status: 'active' };
    }
    if (monthFor) {
      query.monthFor = monthFor;
    }
    return this.paymentRepository.find({
      where: query,
      relations: ['student', 'group', 'course'],
    });
  }

  async getPaymentsByGroupAndStudentName(
  groupId: number,
  studentName?: string,
): Promise<any[]> {
  // Guruhni tekshirish (kursni ham qo‘shamiz!)
  const group = await this.groupRepository.findOne({
    where: { id: groupId, status: 'active' },
    relations: ['students', 'teacher', 'course'],
  });
  if (!group) {
    throw new NotFoundException(`Active group with ID ${groupId} not found`);
  }

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

  const query: any = { group: { id: groupId } };

  if (studentName && studentName.trim() !== '') {
    query.student = [
      { firstName: ILike(`%${studentName.trim()}%`) },
      { lastName: ILike(`%${studentName.trim()}%`) },
    ];
  }

  // Shu guruhdagi mavjud barcha to‘lovlar
  const payments = await this.paymentRepository.find({
    where: query,
    relations: ['student', 'group', 'group.teacher', 'group.course'],
    order: { createdAt: 'DESC' },
  });

  // Shu oyda to‘lov qilgan studentlar id'lari
  const paidThisMonthIds = payments
    .filter((p) => p.monthFor === currentMonth)
    .map((p) => p.student.id);

  // Guruhdagi to‘lov qilmagan studentlar uchun fake Payment obyekt
  const unpaidThisMonth = group.students
    .filter((s) => !paidThisMonthIds.includes(s.id))
    .map((s) => ({
      id: null,
      amount: null,
      adminStatus: null,
      teacherStatus: null,
      paid: false,
      monthFor: currentMonth,
      createdAt: null,
      student: s,
      group,
      course: group.course, // 🔥 endi kurs null bo‘maydi
    }));

  // Hammasini qaytaramiz
  return [...payments, ...unpaidThisMonth];
}

  async findUnpaidPayments(studentName: string, groupId: number, monthFor: string): Promise<Payment[]> {
    const query: any = { paid: false };
    if (studentName) {
      query.student = [
        { firstName: ILike(`%${studentName}%`) },
        { lastName: ILike(`%${studentName}%`) },
      ];
    }
    if (groupId) {
      query.group = { id: groupId, status: 'active' };
    }
    if (monthFor) {
      query.monthFor = monthFor;
    }
    return this.paymentRepository.find({
      where: query,
      relations: ['student', 'group', 'course'],
    });
  }

  async getUnpaidMonths(studentId: number, groupId: number): Promise<string[]> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId, status: 'active' },
      relations: ['students'],
    });
    if (!group) {
      throw new NotFoundException(`Active group with ID ${groupId} not found`);
    }

    const student = group.students.find(s => s.id === studentId);
    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found in group`);
    }

    const firstLesson = await this.lessonRepository.findOne({
      where: { group: { id: groupId } },
      order: { lessonDate: 'ASC' },
    });
    if (!firstLesson) {
      throw new NotFoundException(`No lessons found for group with ID ${groupId}`);
    }

    const firstLessonDate = new Date(firstLesson.lessonDate);
    const today = new Date();
    const unpaidMonths: string[] = [];

    let currentDate = new Date(firstLessonDate.getFullYear(), firstLessonDate.getMonth(), 1);
    while (currentDate <= today) {
      const monthFor = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const payment = await this.paymentRepository.findOne({
        where: {
          student: { id: studentId },
          group: { id: groupId },
          monthFor,
          paid: true,
        },
      });
      if (!payment) {
        unpaidMonths.push(monthFor);
      }
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return unpaidMonths;
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

   async searchPayments(studentName: string, groupId: number, status: string, monthFor: string): Promise<Payment[]> {
    const query: any = {};
    if (studentName) {
      query.student = [
        { firstName: ILike(`%${studentName}%`) },
        { lastName: ILike(`%${studentName}%`) },
      ];
    }
    if (groupId) {
      query.group = { id: groupId, status: 'active' };
    }
    if (status) {
      query.adminStatus = status;
    }
    if (monthFor) {
      query.monthFor = monthFor;
    }
    return this.paymentRepository.find({
      where: query,
      relations: ['student', 'group', 'group.teacher', 'course'],
    });
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
        if (group.status !== 'active') continue;
        const firstLessonDate = await this.getFirstLessonDate(group.id);
        if (!firstLessonDate) continue;

        const { paymentDueDate, reminderDate } = this.calculatePaymentDates(firstLessonDate, today);
        const daysUntilDue = this.getDaysUntilDue(today, paymentDueDate);
        const daysUntilReminder = this.getDaysUntilDue(today, reminderDate);

        if (daysUntilReminder === 0 || daysUntilDue === 0) {
          const unpaidMonths = await this.getUnpaidMonths(student.id, group.id);
          if (unpaidMonths.length > 0) {
            const latestUnpaidMonth = unpaidMonths[0];
            const message =
              daysUntilReminder === 0
                ? `Hurmatli ${student.parentsName}, ${group.name} guruhi uchun ${latestUnpaidMonth} oy to'lovi qilinmagan. Iltimos, to'lovni amalga oshiring.`
                : `Hurmatli ${student.parentsName}, ${group.name} guruhi uchun ${latestUnpaidMonth} oy to'lovi bugun oxirgi muddat. Iltimos, to'lovni amalga oshiring.`;
            if (student.parentPhone) {
              await this.sendSMS(student.parentPhone, message);
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