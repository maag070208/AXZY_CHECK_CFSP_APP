import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class IncidentType extends Model {
  static table = 'incident_types';

  @field('category_id') categoryId!: string;
  @field('name') name!: string;
  @field('value') value!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
