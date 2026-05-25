import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, relation, children } from '@nozbe/watermelondb/decorators';

export default class RecurringLocation extends Model {
  static table = 'recurring_locations';

  @field('recurring_configuration_id') recurringConfigurationId!: string;
  @field('location_id') locationId!: string;
  @field('order') order!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('locations', 'location_id') location!: any;
  @children('recurring_tasks') tasks!: any;
}
