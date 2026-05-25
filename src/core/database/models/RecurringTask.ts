import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class RecurringTask extends Model {
  static table = 'recurring_tasks';

  @field('recurring_location_id') recurringLocationId!: string;
  @field('description') description!: string;
  @field('req_photo') reqPhoto!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
