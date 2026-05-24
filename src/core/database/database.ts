import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import schema from './schema';
import { models } from './models';

// Configurar adaptador SQLite para la app móvil
const adapter = new SQLiteAdapter({
  schema,
  dbName: 'AxzyCheckDB',
  jsi: true,
  onSetUpError: error => {
    console.error('Error al inicializar la base de datos SQLite:', error);
  }
});

// Inicializar instancia global de la base de datos
export const database = new Database({
  adapter,
  modelClasses: models,
});
