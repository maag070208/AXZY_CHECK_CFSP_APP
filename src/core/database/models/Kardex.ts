import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Kardex extends Model {
  static table = 'kardex';

  @field('user_id') userId!: string;
  @field('location_id') locationId!: string;
  @field('timestamp') timestamp!: number;
  @field('notes') notes?: string;
  @field('media') media?: string; // JSON string
  @field('latitude') latitude?: number;
  @field('longitude') longitude?: number;
  @field('assignment_id') assignmentId?: string;
  @field('scan_type') scanType!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
