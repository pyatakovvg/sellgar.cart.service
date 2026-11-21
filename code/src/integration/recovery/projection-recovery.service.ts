import { legacyStoreSnapshot, storePayload } from '../projection/store-payload';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ProjectionKind } from '../projection/integration-event';
import { ProjectionService } from '../projection/projection.service';
import { SourceGateway } from './source.gateway';

@Injectable()
export class ProjectionRecoveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProjectionRecoveryService.name);
  private timer?: ReturnType<typeof setInterval>;
  private pending?: Promise<void>;
  private stopped = false;
  private bootstrapped = false;

  constructor(
    @InjectDataSource() private readonly source: DataSource,
    private readonly gateway: SourceGateway,
    private readonly projections: ProjectionService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.bootstrapped = String(this.config.get('CART_BOOTSTRAP_ON_START', 'true')) !== 'true';
    this.timer = setInterval(() => this.tick(), Number(this.config.get('CART_RECOVERY_INTERVAL_MS', 5000)));
    this.tick();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    await this.pending;
  }

  async synchronize(kind: ProjectionKind, uuid: string): Promise<void> {
    switch (kind) {
      case 'shop':
        await this.projections.synchronize('shop', await this.gateway.shopByUuid(uuid));
        return;
      case 'product':
        await this.projections.synchronize('product', await this.gateway.catalogProduct(uuid));
        return;
      case 'store_product':
        await this.storeProduct(await this.gateway.storeProduct(uuid));
        return;
      case 'record_inventory':
        await this.storeProduct(await this.gateway.storeProductByRecord(uuid));
        return;
    }
  }

  async bootstrap(): Promise<{ products: number }> {
    for (let offset = 0; !this.stopped; offset += 100) {
      const page = await this.gateway.allShops(offset);
      if (!Array.isArray(page?.data)) throw new Error('Invalid Shop bootstrap response');
      for (const shop of page.data) await this.projections.synchronize('shop', shop);
      if (page.data.length < 100) break;
    }
    const result = await this.gateway.allStoreProducts();
    if (!Array.isArray(result?.data)) throw new Error('Invalid Store bootstrap response');
    for (const product of result.data) {
      if (this.stopped) break;
      await this.storeProduct(product);
    }
    return { products: result.data.length };
  }

  async recover(): Promise<void> {
    const issues: {
      aggregate_type: ProjectionKind;
      aggregate_uuid: string;
      payload: { recordUuid?: string };
    }[] = await this.source.query(`SELECT ie.aggregate_type,ie.aggregate_uuid,ie.payload
      FROM sync_issue si JOIN inbox_event ie USING(event_uuid) WHERE si.resolved_at IS NULL ORDER BY si.created_at LIMIT 50`);
    for (const issue of issues) {
      if (this.stopped) break;
      try {
        const uuid =
          issue.aggregate_type === 'record_inventory' ? issue.payload.recordUuid : issue.aggregate_uuid;
        if (!uuid) throw new Error('Inventory recovery has no record reference');
        await this.synchronize(issue.aggregate_type, uuid);
      } catch {
        this.logger.warn(`Projection recovery pending: ${issue.aggregate_type}`);
      }
    }
  }

  private async storeProduct(product: any): Promise<void> {
    // Validate root first, before using its identifiers for owner requests.
    product = await storePayload(product, legacyStoreSnapshot(product));
    await this.synchronize('shop', product.shopUuid);
    await this.synchronize('product', product.productUuid);
    await this.projections.synchronize('store_product', product);
  }

  private tick(): void {
    if (this.pending || this.stopped) return;
    this.pending = (async () => {
      if (!this.bootstrapped) {
        await this.bootstrap();
        this.bootstrapped = true;
      }
      await this.recover();
    })()
      .catch(() => this.logger.warn('Projection bootstrap/recovery will retry'))
      .finally(() => {
        this.pending = undefined;
      });
  }
}
