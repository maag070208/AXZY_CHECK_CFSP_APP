import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Client extends Model {
  static table = 'clients';

  @field('name') name!: string;
  @field('address') address?: string;
  @field('rfc') rfc?: string;
  @field('contact_name') contactName?: string;
  @field('contact_phone') contactPhone?: string;
  @field('active') active!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
