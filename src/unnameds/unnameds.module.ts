import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { unnamedsService } from './unnameds.service';
import { unnamedsController } from './unnameds.controller';
import { RelationalunnamedPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalunnamedPersistenceModule,
  ],
  controllers: [unnamedsController],
  providers: [unnamedsService],
  exports: [unnamedsService, RelationalunnamedPersistenceModule],
})
export class unnamedsModule {}
