import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/domain/user';
import { Job } from '../../jobs/domain/job';
import { PaymentStatus, PaymentMethod } from '../enums/payment-status.enum';
import databaseConfig from '../../database/config/database.config';
import { DatabaseConfig } from '../../database/config/database-config.type';

const idType = (databaseConfig() as DatabaseConfig).isDocumentDatabase
  ? String
  : Number;

export class Payment {
  @ApiProperty({
    type: idType,
  })
  id: number | string;

  @ApiProperty({
    type: () => Job,
    description: 'Trabajo relacionado con el pago',
  })
  job: Job;

  @ApiProperty({
    type: () => User,
    description: 'Usuario que realiza el pago',
  })
  fromUser: User;

  @ApiProperty({
    type: () => User,
    description: 'Usuario que recibe el pago',
  })
  toUser: User;

  @ApiProperty({
    type: Number,
    example: 100.0,
    description: 'Monto total del pago',
  })
  amount: number;

  @ApiProperty({
    type: Number,
    example: 10,
    description: 'Porcentaje de comisión de la plataforma',
  })
  commissionPercentage: number;

  @ApiProperty({
    type: Number,
    example: 10.0,
    description: 'Monto de la comisión',
  })
  commissionAmount: number;

  @ApiProperty({
    type: String,
    enum: PaymentMethod,
    example: PaymentMethod.CREDIT_CARD,
    description: 'Método de pago utilizado',
  })
  paymentMethod: PaymentMethod;

  @ApiProperty({
    type: String,
    example: 'txn_1234567890',
    description: 'ID de transacción del proveedor de pagos',
  })
  transactionId: string;

  @ApiProperty({
    type: String,
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED,
    description: 'Estado del pago',
  })
  status: PaymentStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
