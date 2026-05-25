import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Maintenance extends Model {
  static table = 'maintenances';

  @field('guard_id') guardId!: string;
  @field('title') title!: string;
  @field('category_id') categoryId?: string;
  @field('type_id') typeId?: string;
  @field('description') description?: string;
  @field('media') media?: string; // Serialized as JSON string
  @field('latitude') latitude?: number;
  @field('longitude') longitude?: number;
  @field('status') status!: string;
  @field('client_id') clientId?: string;
  @field('resolved_at') resolvedAt?: number;
  @field('resolved_by_id') resolvedById?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
