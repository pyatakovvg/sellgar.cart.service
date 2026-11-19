import { Logger } from '@nestjs/common';

import { createCartApplication } from './bootstrap';

void createCartApplication()
  .then((app) => app.listen(Number(process.env.PORT ?? 8080)))
  .catch((error) => {
    Logger.error(error instanceof Error ? error.message : 'Cart bootstrap failed', 'Bootstrap');
    process.exitCode = 1;
  });
