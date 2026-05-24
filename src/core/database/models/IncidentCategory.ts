import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class IncidentCategory extends Model {
  static table = 'incident_categories';

  @field('name') name!: string;
  @field('value') value!: string;
  @field('type') type!: string;
  @field('color') color?: string;
  @field('icon') icon?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
