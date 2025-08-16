import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Group } from '../groups/entities/group.entity';
import { Student } from '../students/entities/student.entity';
import { Payment } from '../payment/entities/payment.entity';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async createCourse(createCourseDto: CreateCourseDto): Promise<Course> {
    const existingCourse = await this.courseRepository.findOne({ where: { name: createCourseDto.name } });
    if (existingCourse) {
      throw new BadRequestException(`Course with name ${createCourseDto.name} already exists`);
    }

    const course = this.courseRepository.create(createCourseDto);
    return this.courseRepository.save(course);
  }

   async getAllCourses() {
    const courses = await this.courseRepository.find({ relations: ['groups', 'groups.students'] });

    return courses.map((course) => {
      const groupsCount = course.groups.length;
      const studentsCount = course.groups.reduce(
        (acc, group) => acc + group.students.length,
        0,
      );

      return {
        id: course.id,
        name: course.name,
        description: course.description,
        groupsCount,
        studentsCount,
      };
    });
  }


  async getCourseById(id: number): Promise<Course> {
    const course = await this.courseRepository.findOne({ 
      where: { id }, 
      relations: ['groups', 'groups.students', 'payments'] 
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    return course;
  }

  async updateCourse(id: number, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.getCourseById(id);

    if (updateCourseDto.name) {
      const existingCourse = await this.courseRepository.findOne({ where: { name: updateCourseDto.name } });
      if (existingCourse && existingCourse.id !== id) {
        throw new BadRequestException(`Course with name ${updateCourseDto.name} already exists`);
      }
    }

    Object.assign(course, updateCourseDto);
    return this.courseRepository.save(course);
  }

  async deleteCourse(id: number): Promise<void> {
    const course = await this.getCourseById(id);
    await this.courseRepository.remove(course);
  }

  async searchCourses(name: string): Promise<Course[]> {
    const query: any = {};
    if (name) {
      query.name = ILike(`%${name}%`);
    }
    const courses = await this.courseRepository.find({
      where: query,
      relations: ['groups', 'groups.students', 'payments'],
    });
    if (courses.length === 0) {
      throw new NotFoundException(`No courses found for name "${name}"`);
    }
    return courses;
  }

  async getCourseStatistics(): Promise<any[]> {
    const courses = await this.courseRepository.find({
      relations: ['groups', 'groups.students', 'payments'],
    });

    return courses.map(course => {
      const groupCount = course.groups.length;
      const studentCount = course.groups.reduce((sum, group) => sum + group.students.length, 0);
      const totalRevenue = course.payments
        .filter(payment => payment.paid)
        .reduce((sum, payment) => sum + payment.amount, 0);

      return {
        course,
        groupCount,
        studentCount,
        totalRevenue,
      };
    });
  }
}