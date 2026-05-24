import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Location extends Model {
  static table = 'locations';

  @field('client_id') clientId?: string;
  @field('zone_id') zoneId?: string;
  @field('aisle') aisle?: string;
  @field('spot') spot?: string;
  @field('number') number?: string;
  @field('name') name!: string;
  @field('reference') reference?: string;
  @field('is_occupied') isOccupied!: boolean;
  @field('active') active!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
