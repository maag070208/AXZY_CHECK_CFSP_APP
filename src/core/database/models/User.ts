import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class User extends Model {
  static table = 'users';

  @field('name') name!: string;
  @field('last_name') lastName?: string;
  @field('username') username!: string;
  @field('active') active!: boolean;
  @field('shift_start') shiftStart?: string;
  @field('shift_end') shiftEnd?: string;
  @field('is_logged_in') isLoggedIn!: boolean;
  @field('schedule_id') scheduleId?: string;
  @field('client_id') clientId?: string;
  @field('role_id') roleId!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
