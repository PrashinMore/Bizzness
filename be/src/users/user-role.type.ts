export const USER_ROLES = ['admin', 'staff'] as const;

export type UserRole = (typeof USER_ROLES)[number];

