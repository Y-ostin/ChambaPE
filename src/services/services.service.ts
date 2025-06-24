import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { ServiceCategoryEntity } from './infrastructure/persistence/relational/entities/service-category.entity';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { FindAllServiceCategoriesDto } from './dto/find-all-service-categories.dto';
import { ServiceCategoryDto } from './dto/service-category.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(ServiceCategoryEntity)
    private readonly serviceCategoryRepository: Repository<ServiceCategoryEntity>,
  ) {}

  async create(
    createServiceCategoryDto: CreateServiceCategoryDto,
  ): Promise<ServiceCategoryDto> {
    // Verificar si ya existe una categoría con ese nombre
    const existingCategory = await this.serviceCategoryRepository.findOne({
      where: { name: ILike(createServiceCategoryDto.name) },
    });

    if (existingCategory) {
      throw new ConflictException(
        `Ya existe una categoría con el nombre "${createServiceCategoryDto.name}"`,
      );
    }

    const category = this.serviceCategoryRepository.create(
      createServiceCategoryDto,
    );

    const savedCategory = await this.serviceCategoryRepository.save(category);

    return this.mapToDto(savedCategory);
  }

  async findAll(
    query: FindAllServiceCategoriesDto,
  ): Promise<ServiceCategoryDto[]> {
    const { isActive, includeWorkerCount } = query;

    let queryBuilder =
      this.serviceCategoryRepository.createQueryBuilder('category');

    // Filtrar por estado activo si se especifica
    if (isActive !== undefined) {
      queryBuilder = queryBuilder.where('category.isActive = :isActive', {
        isActive,
      });
    }

    // Incluir contador de trabajadores si se solicita
    if (includeWorkerCount) {
      queryBuilder = queryBuilder
        .leftJoin('worker_profile', 'wp', '1=1') // TODO: Implementar relación many-to-many
        .addSelect('COUNT(wp.id)', 'workerCount')
        .groupBy('category.id');
    }

    queryBuilder = queryBuilder.orderBy('category.name', 'ASC');

    const categories = await queryBuilder.getMany();

    return categories.map((category) => this.mapToDto(category));
  }

  async findOne(id: number): Promise<ServiceCategoryDto> {
    const category = await this.serviceCategoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Categoría de servicio no encontrada');
    }

    return this.mapToDto(category);
  }

  async update(
    id: number,
    updateServiceCategoryDto: UpdateServiceCategoryDto,
  ): Promise<ServiceCategoryDto> {
    const category = await this.serviceCategoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Categoría de servicio no encontrada');
    }

    // Verificar si el nuevo nombre ya existe (si se está cambiando)
    if (
      updateServiceCategoryDto.name &&
      updateServiceCategoryDto.name !== category.name
    ) {
      const existingCategory = await this.serviceCategoryRepository.findOne({
        where: { name: ILike(updateServiceCategoryDto.name) },
      });

      if (existingCategory) {
        throw new ConflictException(
          `Ya existe una categoría con el nombre "${updateServiceCategoryDto.name}"`,
        );
      }
    }

    await this.serviceCategoryRepository.update(id, updateServiceCategoryDto);

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const category = await this.serviceCategoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Categoría de servicio no encontrada');
    }

    // TODO: Verificar si la categoría está en uso por trabajadores
    // cuando se implemente la relación many-to-many

    try {
      await this.serviceCategoryRepository.delete(id);
    } catch {
      throw new ConflictException(
        'No se puede eliminar la categoría porque está en uso',
      );
    }
  }

  async toggleStatus(id: number): Promise<ServiceCategoryDto> {
    const category = await this.serviceCategoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Categoría de servicio no encontrada');
    }

    await this.serviceCategoryRepository.update(id, {
      isActive: !category.isActive,
    });

    return this.findOne(id);
  }

  async findActiveCategories(): Promise<ServiceCategoryDto[]> {
    const categories = await this.serviceCategoryRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    return categories.map((category) => this.mapToDto(category));
  }
  async findByIds(ids: number[]): Promise<ServiceCategoryEntity[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    return this.serviceCategoryRepository.find({
      where: { id: In(ids), isActive: true },
    });
  }

  private mapToDto(category: ServiceCategoryEntity): ServiceCategoryDto {
    return {
      id: category.id,
      name: category.name,
      description: category.description || undefined,
      iconUrl: category.iconUrl || undefined,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
