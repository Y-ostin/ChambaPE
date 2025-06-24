import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceCategoryEntity } from '../../../../services/infrastructure/persistence/relational/entities/service-category.entity';

@Injectable()
export class ServiceCategorySeedService {
  constructor(
    @InjectRepository(ServiceCategoryEntity)
    private repository: Repository<ServiceCategoryEntity>,
  ) {}

  async run() {
    const count = await this.repository.count();

    if (!count) {
      await this.repository.save([
        this.repository.create({
          id: 1,
          name: 'Limpieza del Hogar',
          description: 'Servicios de limpieza residencial y comercial',
          iconUrl: '/icons/cleaning.svg',
          isActive: true,
        }),
        this.repository.create({
          id: 2,
          name: 'Plomería',
          description: 'Reparaciones e instalaciones de plomería',
          iconUrl: '/icons/plumbing.svg',
          isActive: true,
        }),
        this.repository.create({
          id: 3,
          name: 'Electricidad',
          description: 'Instalaciones y reparaciones eléctricas',
          iconUrl: '/icons/electrical.svg',
          isActive: true,
        }),
        this.repository.create({
          id: 4,
          name: 'Jardinería',
          description: 'Mantenimiento de jardines y áreas verdes',
          iconUrl: '/icons/gardening.svg',
          isActive: true,
        }),
        this.repository.create({
          id: 5,
          name: 'Carpintería',
          description: 'Trabajos en madera y muebles',
          iconUrl: '/icons/carpentry.svg',
          isActive: true,
        }),
        this.repository.create({
          id: 6,
          name: 'Pintura',
          description: 'Pintado de interiores y exteriores',
          iconUrl: '/icons/painting.svg',
          isActive: true,
        }),
        this.repository.create({
          id: 7,
          name: 'Cocina/Chef',
          description: 'Servicios de cocina y catering',
          iconUrl: '/icons/cooking.svg',
          isActive: true,
        }),
        this.repository.create({
          id: 8,
          name: 'Cuidado de Niños',
          description: 'Servicios de niñera y cuidado infantil',
          iconUrl: '/icons/childcare.svg',
          isActive: true,
        }),
        this.repository.create({
          id: 9,
          name: 'Cuidado de Mascotas',
          description: 'Paseo y cuidado de mascotas',
          iconUrl: '/icons/petcare.svg',
          isActive: true,
        }),
        this.repository.create({
          id: 10,
          name: 'Mudanzas',
          description: 'Servicios de mudanza y transporte',
          iconUrl: '/icons/moving.svg',
          isActive: true,
        }),
        this.repository.create({
          id: 11,
          name: 'Reparaciones Generales',
          description: 'Reparaciones menores del hogar',
          iconUrl: '/icons/repair.svg',
          isActive: true,
        }),
        this.repository.create({
          id: 12,
          name: 'Tecnología',
          description: 'Soporte técnico y reparación de equipos',
          iconUrl: '/icons/tech.svg',
          isActive: true,
        }),
      ]);
    }
  }
}
