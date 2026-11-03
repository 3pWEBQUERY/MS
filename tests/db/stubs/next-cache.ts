/** Stub für `next/cache`: Cache-Steuerung ist in DB-Tests wirkungslos. */
const noop = (): void => {};
export const cacheLife = noop;
export const cacheTag = noop;
export const updateTag = noop;
export const revalidateTag = noop;
export const revalidatePath = noop;
export const refresh = noop;
