import { Logger } from '@nestjs/common';

import { createCartApplication } from './bootstrap';

void createCartApplication().catch((error) => {
  Logger.error(error instanceof Error ? error.message : 'Cart bootstrap failed', 'Bootstrap');
  process.exitCode = 1;
});
