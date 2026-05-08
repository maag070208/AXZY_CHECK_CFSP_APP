import React from 'react';

export type StackOptions = {
  headerShown?: boolean;
  header?: React.ReactNode;
  title?: string;
};

export type ScreenParams<T = undefined> = {
  options?: StackOptions;
  params?: T;
};

export type RootStackParamList = {
  DRAWER_MAIN: {
    TABS: ScreenParams;
  };

  TABS: {
    HOME_STACK: ScreenParams;
    CHECK_STACK: ScreenParams;
  };

  HOME_STACK: {
    HOME_MAIN: ScreenParams;
  };
  
  INVENTORY_STACK: {
    INVENTORY_MAIN: ScreenParams;
    INVENTORY_MOVE: ScreenParams;
    INVENTORY_LOCATION: ScreenParams;
    INVENTORY_PRODUCT: ScreenParams;
  };

  LOCATIONS_STACK: {
    LOCATIONS_MAIN: ScreenParams;
    LOCATIONS_PRODUCTS: ScreenParams<{
      locationId: number;
      locationName: string;
    }>;
    LOCATIONS_BULK_PRINT: ScreenParams;
  };

  GUARDS_STACK: {
    GUARD_LIST: ScreenParams;
    GUARD_DETAIL: ScreenParams<{ guard: any }>;
    ASSIGNMENT_DETAIL: ScreenParams<{ assignment: any }>;
    GUARD_KARDEX_DETAIL: ScreenParams<{ kardexId: string }>;
  };

  ASSIGNMENTS_STACK: {
    ASSIGNMENT_LIST: ScreenParams;
    MY_ASSIGNMENTS_MAIN: ScreenParams;
  };

  USERS_STACK: {
    USER_LIST: ScreenParams;
  };

  CHECK_STACK: {
    CHECK_SCAN: ScreenParams;
    CHECK_MAIN: ScreenParams<{
      assignmentId?: number;
      expectedLocationId?: number;
      expectedLocationName?: string;
      location?: any;
    }>;
  };

  CLIENTS_STACK: {
    CLIENTS_MAIN: ScreenParams;
    CREATE_CLIENT: ScreenParams;
  };

  ZONES_STACK: {
    ZONES_MAIN: ScreenParams;
  };

  INCIDENTS_STACK: {
    INCIDENT_LIST: ScreenParams;
  };

  MAINTENANCE_STACK: {
    MAINTENANCE_LIST: ScreenParams;
  };

  ROUNDS_STACK: {
    ROUNDS_LIST: ScreenParams;
  };

  SCHEDULES_STACK: {
    SCHEDULES_LIST: ScreenParams;
  };

  RECURRING_STACK: {
    RECURRING_LIST: ScreenParams;
  };

  PROFILE_SCREEN: undefined;
};

export type StackNames = keyof RootStackParamList;

export type ScreenNames<T extends StackNames> = keyof RootStackParamList[T];

export type NavigationParams<
  T extends StackNames,
  S extends ScreenNames<T>,
> = RootStackParamList[T][S] extends ScreenParams<infer P> ? P : undefined;

export const AppStacks: RootStackParamList = {
  DRAWER_MAIN: {
    TABS: {},
  },
  TABS: {
    HOME_STACK: {},
    CHECK_STACK: {},
  },
  HOME_STACK: {
    HOME_MAIN: {},
  },
  INVENTORY_STACK: {
    INVENTORY_MAIN: {},
    INVENTORY_LOCATION: {},
    INVENTORY_MOVE: {},
    INVENTORY_PRODUCT: {},
  },
  LOCATIONS_STACK: {
    LOCATIONS_MAIN: {},
    LOCATIONS_PRODUCTS: {},
    LOCATIONS_BULK_PRINT: {},
  },
  GUARDS_STACK: {
    GUARD_LIST: {},
    GUARD_DETAIL: {},
    ASSIGNMENT_DETAIL: {},
    GUARD_KARDEX_DETAIL: {},
  },
  ASSIGNMENTS_STACK: {
    ASSIGNMENT_LIST: {},
    MY_ASSIGNMENTS_MAIN: {},
  },
  USERS_STACK: {
    USER_LIST: {},
  },
  CHECK_STACK: {
    CHECK_SCAN: {},
    CHECK_MAIN: {},
  },
  CLIENTS_STACK: {
    CLIENTS_MAIN: {},
    CREATE_CLIENT: {},
  },
  ZONES_STACK: {
    ZONES_MAIN: {},
  },
  INCIDENTS_STACK: {
    INCIDENT_LIST: {},
  },
  MAINTENANCE_STACK: {
    MAINTENANCE_LIST: {},
  },
  ROUNDS_STACK: {
    ROUNDS_LIST: {},
  },
  SCHEDULES_STACK: {
    SCHEDULES_LIST: {},
  },
  RECURRING_STACK: {
    RECURRING_LIST: {},
  },
  PROFILE_SCREEN: undefined,
};
