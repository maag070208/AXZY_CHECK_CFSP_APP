import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Round extends Model {
  static table = 'rounds';

  @field('guard_id') guardId!: string;
  @field('client_id') clientId?: string;
  @field('start_time') startTime!: number;
  @field('end_time') endTime?: number;
  @field('status') status!: string;
  @field('recurring_configuration_id') recurringConfigurationId?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
