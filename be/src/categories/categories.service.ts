import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async create(createDto: CreateCategoryDto): Promise<Category> {
    // Check if category with same name already exists
    const existing = await this.categoriesRepository.findOne({
      where: { name: createDto.name },
    });
    if (existing) {
      throw new ConflictException('Category with this name already exists');
    }

    const category = this.categoriesRepository.create({
      name: createDto.name,
      description: createDto.description ?? null,
      isRawMaterial: createDto.isRawMaterial ?? false,
    });

    return await this.categoriesRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    return await this.categoriesRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['products'],
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(
    id: string,
    updateDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if name is being updated and if it conflicts with existing category
    if (updateDto.name && updateDto.name !== category.name) {
      const existing = await this.categoriesRepository.findOne({
        where: { name: updateDto.name },
      });
      if (existing) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    if (updateDto.name !== undefined) {
      category.name = updateDto.name;
    }
    if (updateDto.description !== undefined) {
      category.description = updateDto.description;
    }
    if (updateDto.isRawMaterial !== undefined) {
      category.isRawMaterial = updateDto.isRawMaterial;
    }

    return await this.categoriesRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['products'],
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if category has products
    if (category.products && category.products.length > 0) {
      throw new ConflictException(
        'Cannot delete category that has associated products',
      );
    }

    await this.categoriesRepository.remove(category);
  }
}

