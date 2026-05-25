import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, children } from '@nozbe/watermelondb/decorators';

export default class RecurringConfiguration extends Model {
  static table = 'recurring_configurations';

  @field('title') title!: string;
  @field('client_id') clientId?: string;
  @field('active') active!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('recurring_locations') recurringLocations!: any;
}
